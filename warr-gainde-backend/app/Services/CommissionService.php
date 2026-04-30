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
    public function prelever($driverId, $amount)
    {
        // On utilise une transaction DB pour garantir la sécurité de l'opération
        return DB::transaction(function () use ($driverId, $amount) {
            
            // lockForUpdate() empêche qu'une autre requête modifie le solde en même temps
            $driver = User::lockForUpdate()->findOrFail($driverId);

            // On déduit le montant. 
            // Note : Assure-toi d'avoir ajouté une colonne 'wallet_balance' (decimal ou integer) dans ta table 'users'
            $driver->wallet_balance -= $amount;
            $driver->save();

            /* Optionnel : Historique des transactions
             * Si tu as une table transactions, c'est ici qu'on crée la trace.
             * \App\Models\Transaction::create([
             * 'user_id' => $driver->id,
             * 'type' => 'DEBIT',
             * 'amount' => $amount,
             * 'description' => 'Commission Warr Gaïndé (5%)'
             * ]);
             */

            return $driver->wallet_balance;
        });
    }
}