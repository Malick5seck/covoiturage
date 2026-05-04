<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\PositionGpsUpdated;
use App\Models\PositionGps;
use Illuminate\Http\Request;

class PositionGpsController extends Controller
{
    /**
     * CHAUFFEUR : Enregistre la position ET broadcast en temps réel
     */
    public function enregistrerPosition(Request $request, $trajetId)
    {
        $request->validate([
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        // Sauvegarde en BDD (historique)
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
     * PASSAGER : Récupère la dernière position connue (fallback si WebSocket déconnecté)
     */
    public function dernierePosition($trajetId)
    {
        // Utiliser date_position (colonne existante) et non created_at
        $position = PositionGps::where('trajet_id', $trajetId)
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
                'lat'        => (float) $position->latitude,
                'lng'        => (float) $position->longitude,
                'date_position' => $position->date_position->toDateTimeString(),
            ],
        ]);
    }
}