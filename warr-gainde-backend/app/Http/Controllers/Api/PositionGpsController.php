<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PositionGps;
use Illuminate\Http\Request;

class PositionGpsController extends Controller
{
    /**
     * CHAUFFEUR : Save current position (History maintained)
     */
    public function enregistrerPosition(Request $request, $trajetId)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        // On utilise create() pour empiler chaque nouvelle coordonnée dans la table
        PositionGps::create([
            'trajet_id' => $trajetId,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * PASSAGER : Get the latest position of the driver
     */
    public function dernierePosition($trajetId)
    {
        // On va chercher la toute dernière ligne enregistrée pour ce trajet
        $position = PositionGps::where('trajet_id', $trajetId)
                               ->orderBy('created_at', 'desc')
                               ->first();

        if (!$position) {
            return response()->json(['success' => false, 'message' => 'Position non disponible.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'lat' => (float)$position->latitude,
                'lng' => (float)$position->longitude,
                'last_update' => $position->created_at->diffForHumans()
            ]
        ]);
    }
}