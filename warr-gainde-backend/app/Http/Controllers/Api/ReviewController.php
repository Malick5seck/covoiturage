<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Trajet;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * PASSENGER : Submit a review for a completed trip
     */
    public function store(Request $request, $trajetId)
    {
        $trajet = Trajet::findOrFail($trajetId);
        $user = $request->user();

        // 1. Validation : Le trajet doit être terminé
        if ($trajet->statut !== 'TERMINE') {
            return response()->json(['success' => false, 'message' => 'Vous ne pouvez noter qu\'un trajet terminé.'], 400);
        }

        // 2. Validation : L'utilisateur doit avoir réservé ce trajet
        $hasReserved = \App\Models\Reservation::where('trajet_id', $trajet->id)
                                              ->where('passager_id', $user->id)
                                              ->exists();
        if (!$hasReserved) {
            return response()->json(['success' => false, 'message' => 'Vous n\'étiez pas sur ce trajet.'], 403);
        }

        // 3. Validation : Ne pas voter deux fois
        $alreadyReviewed = Review::where('trajet_id', $trajet->id)
                                 ->where('passenger_id', $user->id)
                                 ->exists();
        if ($alreadyReviewed) {
            return response()->json(['success' => false, 'message' => 'Vous avez déjà évalué ce trajet.'], 400);
        }

        // 4. Enregistrement
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500'
        ]);

        $review = Review::create([
            'trajet_id' => $trajet->id,
            'passenger_id' => $user->id,
            'driver_id' => $trajet->conducteur_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Merci pour votre avis !',
            'data' => $review
        ], 201);
    }
}