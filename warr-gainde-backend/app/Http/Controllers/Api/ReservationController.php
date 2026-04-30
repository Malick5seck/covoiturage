<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Trajet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    /**
     * Un passager demande à réserver une ou plusieurs places.
     */
    public function store(Request $request)
    {
        // 1. Validation stricte des données envoyées par React
        $validatedData = $request->validate([
            'trajet_id' => 'required|exists:trajets,id',
            'nombre_places' => 'required|integer|min:1',
            'type_reservation' => 'required|in:CLASSIQUE,EN_ROUTE',
            'est_pour_un_tiers' => 'boolean',
            'nom_passager_tiers' => 'required_if:est_pour_un_tiers,true|string|nullable',
            'tel_passager_tiers' => 'required_if:est_pour_un_tiers,true|string|nullable',
            'est_privatisee' => 'boolean',
            // Points d'embarquement (optionnels)
            'point_embarquement_nom' => 'nullable|string',
            'point_embarquement_lat' => 'nullable|numeric',
            'point_embarquement_long' => 'nullable|numeric',
        ]);

        // 2. On récupère le trajet concerné
        $trajet = Trajet::findOrFail($validatedData['trajet_id']);

        // 3. RÈGLE MÉTIER : Y a-t-il assez de places ?
        if ($trajet->places_disponibles < $validatedData['nombre_places']) {
            return response()->json([
                'success' => false,
                'message' => 'Désolé, il ne reste pas assez de places disponibles sur ce trajet.'
            ], 400); // 400 = Bad Request
        }

        // 4. On prépare la réservation
        $reservationData = $validatedData;
        $reservationData['passager_id'] = $request->user()->id; // Le passager connecté
        $reservationData['statut'] = 'EN_ATTENTE'; // Statut validé dans l'UML
        
        // 🛡️ SÉCURITÉ FINANCIÈRE : On fige le prix !
        $reservationData['prix_unitaire_fige'] = $trajet->prix_par_place;

        // Si le client privatise, il prend toutes les places restantes
        if ($request->boolean('est_privatisee')) {
            $reservationData['nombre_places'] = $trajet->places_disponibles;
        }

        // 5. Création de la réservation en base de données
        $reservation = Reservation::create($reservationData);

        // (Optionnel) Ici, on pourrait déclencher un Event pour envoyer une Notification au Chauffeur
        // Event::dispatch(new NouvelleReservation($reservation));

        return response()->json([
            'success' => true,
            'message' => 'Votre demande de réservation a été envoyée au chauffeur.',
            'data' => $reservation
        ], 201);
    }

    /**
     * Le chauffeur accepte la réservation (Action vitale !)
     */
    public function accepterReservation(Request $request, $id)
    {
        // On utilise une Transaction DB car on va modifier deux tables (Réservation + Trajet) en même temps
        return DB::transaction(function () use ($request, $id) {
            
            $reservation = Reservation::with('trajet')->findOrFail($id);
            $trajet = $reservation->trajet;

            // Vérification de sécurité : Seul le chauffeur du trajet peut accepter
            if ($trajet->conducteur_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Action non autorisée.'], 403);
            }

            // Vérification anti-doublon
            if ($reservation->statut !== 'EN_ATTENTE') {
                return response()->json(['success' => false, 'message' => 'Cette réservation a déjà été traitée.'], 400);
            }

            // Revérification des places au cas où quelqu'un d'autre aurait été accepté entre temps
            if ($trajet->places_disponibles < $reservation->nombre_places) {
                return response()->json(['success' => false, 'message' => 'Plus assez de places pour accepter.'], 400);
            }

            // 1. On change le statut de la réservation
            $reservation->update(['statut' => 'ACCEPTEE']);

            // 2. On retire les places du véhicule
            $trajet->decrement('places_disponibles', $reservation->nombre_places);

            return response()->json([
                'success' => true,
                'message' => 'Réservation acceptée. Les places ont été déduites de votre véhicule.',
                'data' => $reservation
            ], 200);
        });
    }
    /**
     * HISTORIQUE : Les réservations du passager connecté
     */
    public function mesReservations(Request $request)
    {
        $reservations = Reservation::with(['trajet.conducteur', 'trajet.vehicule'])
                                   ->where('passager_id', $request->user()->id)
                                   ->orderBy('created_at', 'desc')
                                   ->get();

        return response()->json(['success' => true, 'data' => $reservations], 200);
    }

    /**
     * CYCLE DE VIE : Le chauffeur REFUSE une demande
     */
    public function refuserReservation(Request $request, $id)
    {
        $reservation = Reservation::with('trajet')->findOrFail($id);

        if ($reservation->trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($reservation->statut !== 'EN_ATTENTE') {
            return response()->json(['success' => false, 'message' => 'Cette réservation a déjà été traitée.'], 400);
        }

        $reservation->update(['statut' => 'REFUSEE']);

        return response()->json(['success' => true, 'message' => 'La réservation a été refusée.'], 200);
    }

    /**
     * CYCLE DE VIE : Le passager ANNULE sa propre réservation
     */
    public function annulerReservation(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $reservation = Reservation::with('trajet')->findOrFail($id);

            if ($reservation->passager_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if ($reservation->statut === 'ANNULEE' || $reservation->statut === 'REFUSEE') {
                return response()->json(['success' => false, 'message' => 'Réservation déjà annulée ou refusée.'], 400);
            }

            // 🛡️ RÈGLE MÉTIER ABSOLUE : Si le chauffeur avait déjà dit OUI, 
            // l'annulation doit recréditer les places disponibles dans la voiture !
            if ($reservation->statut === 'ACCEPTEE') {
                $reservation->trajet->increment('places_disponibles', $reservation->nombre_places);
            }

            $motif = $request->input('motif_annulation', 'Annulée par le passager');

            $reservation->update([
                'statut' => 'ANNULEE',
                'motif_annulation' => $motif
            ]);

            return response()->json(['success' => true, 'message' => 'Votre réservation a été annulée.'], 200);
        });
    }
}