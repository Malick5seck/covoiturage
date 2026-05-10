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

        $trajet   = Trajet::findOrFail($validatedData['trajet_id']);
        $passager = $request->user();

        if ($trajet->conducteur_id === $passager->id) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas réserver votre propre trajet.',
            ], 400);
        }

        if ($trajet->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Ce trajet n\'accepte plus de nouvelles réservations.',
            ], 400);
        }

        $estPourUnTiers = $request->boolean('est_pour_un_tiers');
        if (!$estPourUnTiers) {
            $dejaReserve = Reservation::where('trajet_id', $trajet->id)
                ->where('passager_id', $passager->id)
                ->where('est_pour_un_tiers', false)
                ->whereNotIn('statut', ['ANNULEE', 'REFUSEE'])
                ->exists();

            if ($dejaReserve) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà une réservation active pour ce trajet.',
                ], 400);
            }
        }

        $nombrePlaces = $request->boolean('est_privatisee')
            ? $trajet->places_disponibles
            : $validatedData['nombre_places'];

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
            'est_pour_un_tiers'      => $estPourUnTiers,
            'nom_passager_tiers'     => $validatedData['nom_passager_tiers'] ?? null,
            'tel_passager_tiers'     => $validatedData['tel_passager_tiers'] ?? null,
            'est_privatisee'         => $request->boolean('est_privatisee'),
            'point_embarquement_nom' => $validatedData['point_embarquement_nom'] ?? null,
            'point_embarquement_lat' => $validatedData['point_embarquement_lat'] ?? null,
            'point_embarquement_long'=> $validatedData['point_embarquement_long'] ?? null,
            'statut'                 => 'EN_ATTENTE',
        ]);

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

    public function accepterReservation(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $reservation = Reservation::findOrFail($id);
            $trajet = Trajet::with('conducteur')->where('id', $reservation->trajet_id)->lockForUpdate()->firstOrFail();

            if ($trajet->conducteur_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if ($trajet->conducteur->statut_verification !== 'VALIDE') {
                return response()->json(['success' => false, 'message' => 'Votre compte doit être validé par l\'administration.'], 403);
            }

            if ($reservation->statut !== 'EN_ATTENTE') {
                return response()->json(['success' => false, 'message' => 'Cette réservation a déjà été traitée.'], 400);
            }

            if ($trajet->places_disponibles < $reservation->nombre_places) {
                return response()->json(['success' => false, 'message' => 'Plus assez de places disponibles.'], 400);
            }

            $reservation->update(['statut' => 'ACCEPTEE']);
            $trajet->decrement('places_disponibles', $reservation->nombre_places);
            $trajet->increment('total_passagers_cumules', $reservation->nombre_places);

            NotificationController::creer(
                $reservation->passager_id,
                'RESERVATION_ACCEPTEE',
                "Bonne nouvelle ! Votre réservation sur le trajet {$trajet->ville_depart} → {$trajet->ville_arrivee} a été acceptée."
            );

            return response()->json(['success' => true, 'message' => 'Réservation acceptée.', 'data' => $reservation], 200);
        });
    }

    public function refuserReservation(Request $request, $id)
    {
        $reservation = Reservation::with('trajet')->findOrFail($id);

        if ($reservation->trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($reservation->statut !== 'EN_ATTENTE') {
            return response()->json(['success' => false, 'message' => 'Cette réservation a déjà été traitée.'], 400);
        }

        $request->validate(['motif' => 'required|string|min:3|max:255']);

        $reservation->update([
            'statut'           => 'REFUSEE',
            'motif_annulation' => $request->motif,
        ]);

        NotificationController::creer(
            $reservation->passager_id,
            'RESERVATION_REFUSEE',
            "Votre réservation a été refusée par le conducteur. Motif : {$request->motif}"
        );

        return response()->json(['success' => true, 'message' => 'La réservation a été refusée.'], 200);
    }

    // =========================================================================
    // ACTIONS DU PASSAGER
    // =========================================================================

    public function annulerReservation(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $reservation = Reservation::findOrFail($id);
            $trajet = Trajet::where('id', $reservation->trajet_id)->lockForUpdate()->firstOrFail();

            if ($reservation->passager_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if (in_array($reservation->statut, ['ANNULEE', 'REFUSEE'])) {
                return response()->json(['success' => false, 'message' => 'Cette réservation est déjà annulée ou refusée.'], 400);
            }

            if ($reservation->statut === 'ACCEPTEE') {
                $trajet->increment('places_disponibles', $reservation->nombre_places);
                $trajet->decrement('total_passagers_cumules', $reservation->nombre_places);
            }

            $motif = $request->input('motif_annulation', 'Annulée par le passager');
            $reservation->update([
                'statut'           => 'ANNULEE',
                'motif_annulation' => $motif,
            ]);

            NotificationController::creer(
                $trajet->conducteur_id,
                'RESERVATION_ANNULEE',
                "{$request->user()->prenom} {$request->user()->nom} a annulé sa réservation sur votre trajet {$trajet->ville_depart} → {$trajet->ville_arrivee}."
            );

            return response()->json(['success' => true, 'message' => 'Votre réservation a été annulée.'], 200);
        });
    }

    // =========================================================================
    // HISTORIQUE
    // =========================================================================

    public function mesReservations(Request $request)
    {
        $reservations = Reservation::with([
            'trajet.conducteur:id,nom,prenom,photo_profil,note_moyenne',
            'trajet.vehicule:id,marque_modele,immatriculation,climatisation,photo_vehicule'
        ])
        ->where('passager_id', $request->user()->id)
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['success' => true, 'data' => $reservations], 200);
    }

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

        return response()->json(['success' => true, 'data' => $reservations], 200);
    }
}