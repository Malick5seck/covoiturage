<?php

namespace App\Services;

use App\Models\Recharge;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CommissionService
{
   
    public function prelever(int $conducteurId, int $trajetId, float $montant): float
    {
        return DB::transaction(function () use ($conducteurId, $trajetId, $montant) {

            // lockForUpdate() empêche deux requêtes simultanées de modifier le solde
            $conducteur = User::lockForUpdate()->findOrFail($conducteurId);

            // Décrémenter le solde (peut devenir négatif = dette envers la plateforme)
            $conducteur->decrement('solde_portefeuille', $montant);
            $conducteur->refresh(); // Recharger pour avoir le nouveau solde exact

            // Créer la trace dans la table recharges (obligatoire selon UML)
            Recharge::create([
                'conducteur_id'    => $conducteurId,
                'trajet_id'        => $trajetId,
                'montant'          => $montant,
                'type_transaction' => 'PRELEVEMENT',
                'statut'           => 'REUSSI',
            ]);

            return (float) $conducteur->solde_portefeuille;
        });
    }

    
    public function recharger(int $conducteurId, float $montant): float
    {
        return DB::transaction(function () use ($conducteurId, $montant) {

            $conducteur = User::lockForUpdate()->findOrFail($conducteurId);
            $conducteur->increment('solde_portefeuille', $montant);
            $conducteur->refresh();

            Recharge::create([
                'conducteur_id'    => $conducteurId,
                'trajet_id'        => null,
                'montant'          => $montant,
                'type_transaction' => 'RECHARGE',
                'statut'           => 'REUSSI',
            ]);

            return (float) $conducteur->solde_portefeuille;
        });
    }


    public function calculer(float $prixParPlace, int $placesOccupees, float $tauxCommissionApplique): float
    {
        $montantTotal = $prixParPlace * $placesOccupees;
        return round($montantTotal * ($tauxCommissionApplique / 100), 2);
    }
}