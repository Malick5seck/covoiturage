<?php

namespace App\Services;

use App\Models\Recharge;
use App\Models\User;
use App\Models\Trajet;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Exception;

class CommissionService
{
    /**
     * Retourne le taux de commission global actuellement en vigueur.
     */
    public static function getTauxActuel(): float
    {
        return (float) (Setting::where('key', 'taux_commission')->value('value') ?? 5.0);
    }

    /**
     * Calcule le montant de la commission en FCFA (entier).
     */
    public function calculer(int $prixParPlace, int $placesOccupees, float $tauxCommissionApplique): int
    {
        $montantTotal = $prixParPlace * $placesOccupees;
        return (int) round($montantTotal * ($tauxCommissionApplique / 100));
    }

    /**
     * Calcule la commission totale cumulée d'un trajet (basée sur le flux de passagers).
     */
    public function calculerCommissionTrajet(Trajet $trajet): int
    {
        return $this->calculer(
            $trajet->prix_par_place,
            $trajet->total_passagers_cumules,
            (float) $trajet->taux_commission_applique
        );
    }

    /**
     * Prélève une commission (appel public).
     */
    public function prelever(int $conducteurId, int $trajetId, int $montant): int
    {
        return $this->ajusterSolde($conducteurId, $trajetId, $montant, 'PRELEVEMENT');
    }

    /**
     * Recharge le portefeuille (appel public).
     */
    public function recharger(int $conducteurId, int $montant): int
    {
        return $this->ajusterSolde($conducteurId, null, $montant, 'RECHARGE');
    }

    /**
     * Rembourse une commission (appel public).
     */
    public function rembourser(int $conducteurId, int $trajetId, int $montant): int
    {
        return $this->ajusterSolde($conducteurId, $trajetId, $montant, 'REMBOURSEMENT');
    }

    /**
     * Méthode privée générique pour toute opération sur le solde.
     *
     * @param int         $conducteurId
     * @param int|null    $trajetId
     * @param int         $montant        Montant positif (en FCFA)
     * @param string      $typeTransaction PRELEVEMENT, RECHARGE ou REMBOURSEMENT
     *
     * @return int Nouveau solde
     * @throws Exception
     */
    private function ajusterSolde(int $conducteurId, ?int $trajetId, int $montant, string $typeTransaction): int
    {
        return DB::transaction(function () use ($conducteurId, $trajetId, $montant, $typeTransaction) {
            // Verrouiller l'utilisateur pour éviter les race conditions
            $conducteur = User::where('id', $conducteurId)->lockForUpdate()->firstOrFail();

            // Déterminer la direction (débit ou crédit) selon le type
            switch ($typeTransaction) {
                case 'PRELEVEMENT':
                    if ($conducteur->solde_portefeuille < $montant) {
                        throw new Exception(
                            "Solde insuffisant pour couvrir la commission (Solde actuel: {$conducteur->solde_portefeuille} FCFA). Recharge requise."
                        );
                    }
                    $conducteur->decrement('solde_portefeuille', $montant);
                    break;

                case 'RECHARGE':
                case 'REMBOURSEMENT':
                    $conducteur->increment('solde_portefeuille', $montant);
                    break;

                default:
                    throw new \InvalidArgumentException("Type de transaction inconnu : $typeTransaction");
            }

            $conducteur->refresh();

            // Tracer l'opération dans l'historique comptable
            Recharge::create([
                'conducteur_id'    => $conducteurId,
                'trajet_id'        => $trajetId,
                'montant'          => $montant,
                'type_transaction' => $typeTransaction,
                'statut'           => 'REUSSI',
            ]);

            return (int) $conducteur->solde_portefeuille;
        });
    }
}