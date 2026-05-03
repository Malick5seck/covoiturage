<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\Reservation;
use App\Models\Trajet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class EvaluationController extends Controller
{
   
    public function store(Request $request, $trajetId)
    {
        $request->validate([
            'note'        => 'required|integer|min:1|max:5',
            'commentaire' => 'nullable|string|max:1000',
        ]);

        $trajet    = Trajet::findOrFail($trajetId);
        $passagerId = $request->user()->id;

        // Règle 1 : Trajet terminé
        if ($trajet->statut !== 'TERMINE') {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez évaluer qu\'un trajet terminé.',
            ], 400);
        }

        // Règle 2 : Le passager a bien voyagé (réservation ACCEPTEE)
        $aVoyage = Reservation::where('trajet_id', $trajet->id)
                               ->where('passager_id', $passagerId)
                               ->where('statut', 'ACCEPTEE')
                               ->exists();

        if (!$aVoyage) {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'avez pas de réservation validée pour ce trajet.',
            ], 403);
        }

        // Règle 3 : Une seule évaluation par trajet par passager
        $dejaEvalue = Evaluation::where('trajet_id', $trajet->id)
                                 ->where('passager_id', $passagerId)
                                 ->exists();

        if ($dejaEvalue) {
            return response()->json([
                'success' => false,
                'message' => 'Vous avez déjà évalué ce trajet.',
            ], 400);
        }

        // Règle 4 : Création + recalcul de la note moyenne dans une transaction
        return DB::transaction(function () use ($request, $trajet, $passagerId) {

            $evaluation = Evaluation::create([
                'trajet_id'    => $trajet->id,
                'passager_id'  => $passagerId,
                'conducteur_id' => $trajet->conducteur_id,
                'note'         => $request->note,
                'commentaire'  => $request->commentaire,
            ]);

            // Recalcul de la note moyenne du conducteur sur toutes ses évaluations
            $nouvelleMoyenne = Evaluation::where('conducteur_id', $trajet->conducteur_id)
                                          ->avg('note');

            $trajet->conducteur()->update([
                'note_moyenne' => round($nouvelleMoyenne, 2),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Merci pour votre évaluation ! La note du conducteur a été mise à jour.',
                'data'    => [
                    'id'           => $evaluation->id,
                    'note'         => $evaluation->note,
                    'commentaire'  => $evaluation->commentaire,
                    'nouvelle_note_conducteur' => round($nouvelleMoyenne, 2),
                ],
            ], 201);
        });
    }

    public function indexChauffeur($conducteurId)
    {
        $evaluations = Evaluation::with('passager:id,nom,prenom,photo_profil')
                                  ->where('conducteur_id', $conducteurId)
                                  ->orderBy('created_at', 'desc')
                                  ->paginate(10);

        return response()->json([
            'success' => true,
            'data'    => $evaluations->items(),
            'total'   => $evaluations->total(),
        ], 200);
    }

    /**
     * Évaluations données par le passager connecté (son historique d'avis).
     */
    public function mesEvaluations(Request $request)
    {
        $evaluations = Evaluation::with('trajet:id,ville_depart,ville_arrivee,date_heure_depart')
                                  ->where('passager_id', $request->user()->id)
                                  ->orderBy('created_at', 'desc')
                                  ->get();

        return response()->json([
            'success' => true,
            'data'    => $evaluations,
        ], 200);
    }
}