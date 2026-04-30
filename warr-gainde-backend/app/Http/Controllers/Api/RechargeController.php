<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recharge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RechargeController extends Controller
{
    /**
     * V1 : Le chauffeur recharge son portefeuille interne (Simulation)
     */
    public function rechargerCompte(Request $request)
    {
        // 1. On vérifie que le montant est valide (ex: minimum 500 FCFA)
        $request->validate([
            'montant' => 'required|numeric|min:500',
        ]);

        $conducteur = $request->user();

        // 2. Transaction sécurisée pour mettre à jour les deux tables en même temps
        return DB::transaction(function () use ($request, $conducteur) {
            
            // A. On augmente le solde virtuel du chauffeur
            $conducteur->increment('solde_portefeuille', $request->montant);

            // B. On crée le reçu dans la base de données
            $recharge = Recharge::create([
                'conducteur_id' => $conducteur->id,
                'montant' => $request->montant,
                'type_transaction' => 'RECHARGE',
                'statut' => 'REUSSI', // Dans la V1, la recharge est validée d'office
                // Le trajet_id et le transaction_id restent vides pour une recharge simple
            ]);

            return response()->json([
                'success' => true,
                'message' => "Votre compte a été rechargé de {$request->montant} FCFA avec succès.",
                'nouveau_solde' => $conducteur->solde_portefeuille,
                'data' => $recharge
            ], 200);
        });
    }

    /**
     * Affiche l'historique financier du chauffeur (Recharges et Prélèvements)
     */
    public function historique(Request $request)
    {
        // On récupère toutes les transactions du chauffeur connecté, de la plus récente à la plus ancienne
        $historique = Recharge::where('conducteur_id', $request->user()->id)
                              ->orderBy('created_at', 'desc')
                              ->get();

        return response()->json([
            'success' => true,
            'data' => $historique
        ], 200);
    }
}