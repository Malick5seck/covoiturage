<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\NotificationController;
use App\Models\Reservation;
use App\Models\Trajet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    // =========================================================================
    // CRÉATION D'UNE RÉSERVATION
    // =========================================================================

    /**
     * Un passager demande à réserver une ou plusieurs places.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'trajet_id'              => 'required|exists:trajets,id',
            'nombre_places'          => 'required|integer|min:1',
            'type_reservation'       => 'required|in:CLASSIQUE,EN_ROUTE',
            'est_pour_un_tiers'      => 'boolean',
            'nom_passager_tiers'     => 'required_if:est_pour_un_tiers,true|nullable|string|max:255',
            'tel_passager_tiers'     => 'required_if:est_pour_un_tiers,true|nullable|string|max:20',
            'est_privatisee'         => 'boolean',
            'point_embarquement_nom' => 'nullable|string|max:255',
            'point_embarquement_lat' => 'nullable|numeric',
            'point_embarquement_long'=> 'nullable|numeric',
        ]);

        $trajet    = Trajet::findOrFail($validatedData['trajet_id']);
        $passager  = $request->user();

        // Le conducteur ne peut pas réserver son propre trajet
        if ($trajet->conducteur_id === $passager->id) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas réserver votre propre trajet.',
            ], 400);
        }

        // Le trajet doit être en attente (pas encore démarré)
        if ($trajet->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Ce trajet n\'accepte plus de nouvelles réservations.',
            ], 400);
        }

        // Vérifier si le passager n'a pas déjà réservé ce trajet
        $dejaReserve = Reservation::where('trajet_id', $trajet->id)
                                   ->where('passager_id', $passager->id)
                                   ->whereNotIn('statut', ['ANNULEE', 'REFUSEE'])
                                   ->exists();

        if ($dejaReserve) {
            return response()->json([
                'success' => false,
                'message' => 'Vous avez déjà une réservation active pour ce trajet.',
            ], 400);
        }

        // Si privatisation, le passager prend toutes les places restantes
        $nombrePlaces = $request->boolean('est_privatisee')
            ? $trajet->places_disponibles
            : $validatedData['nombre_places'];

        // Vérifier la disponibilité
        if ($trajet->places_disponibles < $nombrePlaces) {
            return response()->json([
                'success' => false,
                'message' => "Désolé, il ne reste que {$trajet->places_disponibles} place(s) disponible(s).",
            ], 400);
        }

        $reservation = Reservation::create([
            'passager_id'            => $passager->id,
            'trajet_id'              => $trajet->id,
            'nombre_places'          => $nombrePlaces,
            'type_reservation'       => $validatedData['type_reservation'],
            'prix_unitaire_fige'     => $trajet->prix_par_place,
            'est_pour_un_tiers'      => $request->boolean('est_pour_un_tiers'),
            'nom_passager_tiers'     => $validatedData['nom_passager_tiers'] ?? null,
            'tel_passager_tiers'     => $validatedData['tel_passager_tiers'] ?? null,
            'est_privatisee'         => $request->boolean('est_privatisee'),
            'point_embarquement_nom' => $validatedData['point_embarquement_nom'] ?? null,
            'point_embarquement_lat' => $validatedData['point_embarquement_lat'] ?? null,
            'point_embarquement_long'=> $validatedData['point_embarquement_long'] ?? null,
            'statut'                 => 'EN_ATTENTE',
        ]);

        // Notifier le conducteur d'une nouvelle demande
        NotificationController::creer(
            $trajet->conducteur_id,
            'RESERVATION_RECUE',
            "{$passager->prenom} {$passager->nom} demande {$nombrePlaces} place(s) sur votre trajet {$trajet->ville_depart} → {$trajet->ville_arrivee}."
        );

        return response()->json([
            'success' => true,
            'message' => 'Votre demande de réservation a été envoyée au chauffeur.',
            'data'    => $reservation,
        ], 201);
    }

    // =========================================================================
    // ACTIONS DU CONDUCTEUR
    // =========================================================================

    /**
     * Le conducteur accepte une réservation.
     */
    public function accepterReservation(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {

            $reservation = Reservation::with('trajet')->findOrFail($id);
            $trajet      = $reservation->trajet;

            // Seul le conducteur du trajet peut accepter
            if ($trajet->conducteur_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if ($reservation->statut !== 'EN_ATTENTE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette réservation a déjà été traitée (statut : ' . $reservation->statut . ').',
                ], 400);
            }

            // Double vérification des places (race condition)
            if ($trajet->places_disponibles < $reservation->nombre_places) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plus assez de places disponibles pour accepter cette réservation.',
                ], 400);
            }

            $reservation->update(['statut' => 'ACCEPTEE']);
            $trajet->decrement('places_disponibles', $reservation->nombre_places);

            // Notifier le passager que sa réservation est acceptée
            NotificationController::creer(
                $reservation->passager_id,
                'RESERVATION_ACCEPTEE',
                "Bonne nouvelle ! Votre réservation sur le trajet {$trajet->ville_depart} → {$trajet->ville_arrivee} a été acceptée."
            );

            return response()->json([
                'success' => true,
                'message' => 'Réservation acceptée. Les places ont été déduites de votre véhicule.',
                'data'    => $reservation,
            ], 200);
        });
    }

    /**
     * Le conducteur refuse une réservation.
     */
    public function refuserReservation(Request $request, $id)
    {
        $reservation = Reservation::with('trajet')->findOrFail($id);

        if ($reservation->trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($reservation->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Cette réservation a déjà été traitée.',
            ], 400);
        }

        $reservation->update(['statut' => 'REFUSEE']);

        // Notifier le passager du refus
        NotificationController::creer(
            $reservation->passager_id,
            'RESERVATION_REFUSEE',
            "Votre réservation sur le trajet {$reservation->trajet->ville_depart} → {$reservation->trajet->ville_arrivee} a été refusée par le conducteur."
        );

        return response()->json([
            'success' => true,
            'message' => 'La réservation a été refusée.',
        ], 200);
    }

    // =========================================================================
    // ACTIONS DU PASSAGER
    // =========================================================================

    /**
     * Le passager annule sa propre réservation.
     * Si elle était ACCEPTEE, les places sont restituées au trajet.
     */
    public function annulerReservation(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {

            $reservation = Reservation::with('trajet')->findOrFail($id);

            if ($reservation->passager_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if (in_array($reservation->statut, ['ANNULEE', 'REFUSEE'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette réservation est déjà annulée ou refusée.',
                ], 400);
            }

            // Si le conducteur avait accepté, on restitue les places
            if ($reservation->statut === 'ACCEPTEE') {
                $reservation->trajet->increment('places_disponibles', $reservation->nombre_places);
            }

            $motif = $request->input('motif_annulation', 'Annulée par le passager');

            $reservation->update([
                'statut'           => 'ANNULEE',
                'motif_annulation' => $motif,
            ]);

            // Notifier le conducteur de l'annulation
            NotificationController::creer(
                $reservation->trajet->conducteur_id,
                'ANNULATION',
                "{$request->user()->prenom} {$request->user()->nom} a annulé sa réservation sur votre trajet {$reservation->trajet->ville_depart} → {$reservation->trajet->ville_arrivee}."
            );

            return response()->json([
                'success' => true,
                'message' => 'Votre réservation a été annulée.',
            ], 200);
        });
    }

    // =========================================================================
    // HISTORIQUE
    // =========================================================================

    /**
     * Toutes les réservations du passager connecté.
     */
    public function mesReservations(Request $request)
    {
        $reservations = Reservation::with([
            'trajet.conducteur:id,nom,prenom,photo_profil,note_moyenne',
            'trajet.vehicule:id,marque_modele,immatriculation,climatisation',
        ])
        ->where('passager_id', $request->user()->id)
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'data'    => $reservations,
        ], 200);
    }

    /**
     * Toutes les demandes reçues sur les trajets du conducteur connecté.
     * Utile pour le dashboard conducteur (onglet "Demandes en attente").
     */
    public function demandesRecues(Request $request)
    {
        $reservations = Reservation::with([
            'passager:id,nom,prenom,photo_profil,telephone',
            'trajet:id,ville_depart,ville_arrivee,date_heure_depart,prix_par_place',
        ])
        ->whereHas('trajet', function ($q) use ($request) {
            $q->where('conducteur_id', $request->user()->id);
        })
        ->where('statut', 'EN_ATTENTE')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'data'    => $reservations,
        ], 200);
    }
}