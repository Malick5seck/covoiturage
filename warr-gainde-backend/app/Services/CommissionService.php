<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Exception;

class CommissionService
{
    /**
     * Deduct the commission amount from the driver's wallet.
     * (We keep the method names aligned with your English structural standards where applicable).
     */
    // Correction dans CommissionService.php
public function prelever($driverId, $trajetId, $amount, $tauxApplique)
{
    return DB::transaction(function () use ($driverId, $trajetId, $amount, $tauxApplique) {
        $driver = User::lockForUpdate()->findOrFail($driverId);

        // Vérification du solde (peut devenir négatif = dette)
        $driver->decrement('solde_portefeuille', $amount);

        // Traçabilité obligatoire selon UML — entité RECHARGE
        \App\Models\Recharge::create([
            'conducteur_id'  => $driverId,
            'trajet_id'      => $trajetId,
            'montant'        => $amount,
            'type_transaction' => 'PRELEVEMENT',
            'statut'         => 'REUSSI',
        ]);

        return $driver->solde_portefeuille;
    });
}
}