<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\PositionGpsUpdated;
use App\Models\PositionGps;
use App\Models\Trajet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PositionGpsController extends Controller
{
    // =========================================================================
    // CHAUFFEUR — Enregistrement d'une position
    // =========================================================================

    /**
     * Enregistre la position GPS du chauffeur ET la broadcast en temps réel.
     *
     * SÉCURITÉ : Seul le conducteur du trajet peut envoyer des positions.
     * OPTIMISATION : On vérifie que le trajet est bien EN_COURS avant d'insérer.
     */
    public function enregistrerPosition(Request $request, int $trajetId): JsonResponse
    {
        $request->validate([
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'precision_metres' => 'nullable|numeric|min:0',
        ]);

        // Vérification que le trajet existe et appartient bien à ce conducteur
        $trajet = Trajet::where('id', $trajetId)
                        ->where('conducteur_id', $request->user()->id)
                        ->where('statut', 'EN_COURS')
                        ->first();

        if (!$trajet) {
            return response()->json([
                'success' => false,
                'message' => 'Trajet introuvable, non autorisé, ou pas en cours.',
            ], 403);
        }

        // Sauvegarde en BDD (historique complet du trajet)
        PositionGps::create([
            'trajet_id'        => $trajetId,
            'latitude'         => $request->latitude,
            'longitude'        => $request->longitude,
            'precision_metres' => $request->precision_metres,
            'statut_trajet'    => 'EN_COURS',
            // date_position est rempli automatiquement par useCurrent()
        ]);

        // Mise à jour de la position actuelle sur le trajet lui-même
        // (évite une jointure côté front pour afficher la position live)
        $trajet->update([
            'latitude_actuelle'  => $request->latitude,
            'longitude_actuelle' => $request->longitude,
        ]);

        // Broadcast WebSocket vers tous les passagers abonnés à ce canal
        broadcast(new PositionGpsUpdated(
            trajet_id:  $trajetId,
            latitude:   (float) $request->latitude,
            longitude:  (float) $request->longitude,
            updated_at: now()->toDateTimeString(),
        ));

        return response()->json(['success' => true], 200);
    }

    // =========================================================================
    // PASSAGER — Récupération de la dernière position connue
    // =========================================================================

    /**
     * Retourne la dernière position GPS connue d'un trajet.
     *
     * Utilisé comme fallback si le WebSocket est déconnecté.
     * BUG CORRIGÉ : tri par `date_position` (existe) au lieu de `created_at`
     * (n'existait pas dans l'ancienne migration → ordre imprévisible).
     */
    public function dernierePosition(int $trajetId): JsonResponse
    {
        $position = PositionGps::dernierePositionDu($trajetId);

        if (!$position) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune position GPS disponible pour ce trajet.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'lat'        => $position->latitude,
                'lng'        => $position->longitude,
                'precision'  => $position->precision_metres,
                'updated_at' => $position->date_position->diffForHumans(),
                'statut'     => $position->statut_trajet,
            ],
        ], 200);
    }

    // =========================================================================
    // ADMIN / CONDUCTEUR — Historique des positions d'un trajet
    // =========================================================================

    /**
     * Retourne l'historique complet des positions d'un trajet.
     * Accessible au conducteur du trajet et aux admins.
     * Utile pour rejouer le parcours sur une carte après le trajet.
     */
    public function historiquePositions(Request $request, int $trajetId): JsonResponse
    {
        $trajet = Trajet::findOrFail($trajetId);

        // Seul le conducteur ou un admin peut voir l'historique complet
        if ($trajet->conducteur_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $positions = PositionGps::where('trajet_id', $trajetId)
                                 ->orderBy('date_position', 'asc') // Ordre chronologique pour rejouer
                                 ->get(['latitude', 'longitude', 'date_position', 'precision_metres']);

        return response()->json([
            'success'         => true,
            'trajet_id'       => $trajetId,
            'nombre_points'   => $positions->count(),
            'data'            => $positions,
        ], 200);
    }
}