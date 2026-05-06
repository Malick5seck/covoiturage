<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\PositionGpsUpdated;
use App\Models\PositionGps;
use App\Models\Reservation;
use App\Models\Trajet;
use Illuminate\Http\Request;

class PositionGpsController extends Controller
{
    /**
     * CHAUFFEUR : Enregistre la position ET broadcast en temps réel
     */
    public function enregistrerPosition(Request $request, $trajetId)
    {
        $trajet = Trajet::findOrFail($trajetId);

        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($trajet->statut !== 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'Le trajet doit être en cours pour enregistrer une position.',
            ], 400);
        }

        $request->validate([
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        // Sauvegarde en BDD (points EN_COURS, supprimés à la fin du trajet)
        PositionGps::create([
            'trajet_id' => $trajetId,
            'latitude'  => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        // Broadcast WebSocket vers tous les passagers connectés à ce canal
        broadcast(new PositionGpsUpdated(
            trajet_id:  (int) $trajetId,
            latitude:   (float) $request->latitude,
            longitude:  (float) $request->longitude,
            updated_at: now()->toDateTimeString(),
        ));

        return response()->json(['success' => true]);
    }

    /**
     * Chauffeur ou passager accepté : dernière position (fallback si WebSocket déconnecté)
     */
    public function dernierePosition(Request $request, $trajetId)
    {
        $trajet = Trajet::findOrFail($trajetId);
        $user   = $request->user();

        $estConducteur = (int) $trajet->conducteur_id === (int) $user->id;
        $estPassagerAccepte = Reservation::where('trajet_id', $trajetId)
            ->where('passager_id', $user->id)
            ->where('statut', 'ACCEPTEE')
            ->exists();

        if (! $estConducteur && ! $estPassagerAccepte) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($trajet->statut !== 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'Position non disponible.',
            ], 404);
        }

        $position = PositionGps::where('trajet_id', $trajetId)
            ->where('statut_trajet', 'EN_COURS')
            ->orderBy('date_position', 'desc')
            ->first();

        if (!$position) {
            return response()->json([
                'success' => false,
                'message' => 'Position non disponible.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'lat'             => (float) $position->latitude,
                'lng'             => (float) $position->longitude,
                'date_position'   => $position->date_position->toDateTimeString(),
                'updated_at'      => $position->date_position->toDateTimeString(),
            ],
        ]);
    }

    /**
     * Historique des positions (trajet en cours) — même contrôle d’accès que la dernière position.
     */
    public function historiquePositions(Request $request, $trajetId)
    {
        $trajet = Trajet::findOrFail($trajetId);
        $user   = $request->user();

        $estConducteur = (int) $trajet->conducteur_id === (int) $user->id;
        $estPassagerAccepte = Reservation::where('trajet_id', $trajetId)
            ->where('passager_id', $user->id)
            ->where('statut', 'ACCEPTEE')
            ->exists();

        if (! $estConducteur && ! $estPassagerAccepte) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($trajet->statut !== 'EN_COURS') {
            return response()->json(['success' => true, 'data' => []]);
        }

        $points = PositionGps::where('trajet_id', $trajetId)
            ->where('statut_trajet', 'EN_COURS')
            ->orderBy('date_position', 'asc')
            ->get(['latitude', 'longitude', 'date_position']);

        return response()->json(['success' => true, 'data' => $points]);
    }
}