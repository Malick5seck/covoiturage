<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\Trajet;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluationController extends Controller
{
    /**
     * Un passager évalue un chauffeur après un trajet.
     */
    public function store(Request $request, $trajetId)
    {
        // 1. Validation de la note (entre 1 et 5 étoiles)
        $request->validate([
            'note' => 'required|integer|min:1|max:5',
            'commentaire' => 'nullable|string|max:1000'
        ]);

        $trajet = Trajet::findOrFail($trajetId);
        $passagerId = $request->user()->id;

        // 2. RÈGLE MÉTIER 1 : Le trajet doit être TERMINE
        if ($trajet->statut !== 'TERMINE') {
            return response()->json(['success' => false, 'message' => 'Vous ne pouvez évaluer qu\'un trajet terminé.'], 400);
        }

        // 3. RÈGLE MÉTIER 2 : Le passager doit avoir voyagé sur ce trajet (Réservation ACCEPTEE)
        $aVoyage = Reservation::where('trajet_id', $trajet->id)
                              ->where('passager_id', $passagerId)
                              ->where('statut', 'ACCEPTEE')
                              ->exists();

        if (!$aVoyage) {
            return response()->json(['success' => false, 'message' => 'Vous n\'avez pas de réservation validée pour ce trajet.'], 403);
        }

        // 4. RÈGLE MÉTIER 3 : On ne note qu'une seule fois !
        $dejaEvalue = Evaluation::where('trajet_id', $trajet->id)
                                ->where('passager_id', $passagerId)
                                ->exists();

        if ($dejaEvalue) {
            return response()->json(['success' => false, 'message' => 'Vous avez déjà évalué ce trajet.'], 400);
        }

        // 5. TRANSACTION : On enregistre la note ET on met à jour la moyenne du chauffeur
        return DB::transaction(function () use ($request, $trajet, $passagerId) {
            
            // A. Création de l'évaluation
            $evaluation = Evaluation::create([
                'trajet_id' => $trajet->id,
                'passager_id' => $passagerId,
                'conducteur_id' => $trajet->conducteur_id,
                'note' => $request->note,
                'commentaire' => $request->commentaire,
            ]);

            // B. Recalcul de la note moyenne du chauffeur
            $nouvelleMoyenne = Evaluation::where('conducteur_id', $trajet->conducteur_id)->avg('note');
            
            // C. Mise à jour du profil du chauffeur
            $trajet->conducteur()->update([
                'note_moyenne' => round($nouvelleMoyenne, 2)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Merci pour votre évaluation !',
                'data' => $evaluation
            ], 201);
        });
    }

    /**
     * Affiche les évaluations reçues par un chauffeur (Pour son profil)
     */
    public function indexChauffeur($conducteurId)
    {
        $evaluations = Evaluation::with('passager:id,nom,prenom,photo_profil')
                                 ->where('conducteur_id', $conducteurId)
                                 ->orderBy('created_at', 'desc')
                                 ->get();

        return response()->json([
            'success' => true,
            'data' => $evaluations
        ], 200);
    }
}