<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recharge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;


class RechargeController extends Controller
{
    /**
     * Étape 1 : Initier un paiement PayDunya
     * Le chauffeur demande à recharger → on crée une facture PayDunya
     * et on retourne l'URL de paiement au frontend.
     */
    public function initierRecharge(Request $request)
    {
        $request->validate([
            'montant' => 'required|numeric|min:500',
        ]);

        $conducteur = $request->user();

        // Référence unique pour retrouver la transaction au webhook
        $reference = 'WG-' . $conducteur->id . '-' . time();

        $response = Http::post('https://app.paydunya.com/api/v1/checkout-invoice/create', [
            'invoice' => [
                'total_amount'  => $request->montant,
                'description'   => "Recharge portefeuille Warr Gaïndé - {$conducteur->prenom} {$conducteur->nom}",
            ],
            'store' => [
                'name' => 'Warr Gaïndé',
            ],
            'actions' => [
                'cancel_url'  => config('app.frontend_url') . '/portefeuille?status=annule',
                'return_url'  => config('app.frontend_url') . '/portefeuille?status=succes',
                'callback_url' => config('app.url') . '/api/recharges/webhook',
            ],
            'custom_data' => [
                'conducteur_id' => $conducteur->id,
                'montant'       => $request->montant,
                'reference'     => $reference,
            ],
        ], [
            'PAYDUNYA-MASTER-KEY' => config('services.paydunya.master_key'),
            'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
            'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
        ]);

        if (!$response->successful() || $response->json('response_code') !== '00') {
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'initier le paiement. Veuillez réessayer.',
            ], 500);
        }

        // On crée la recharge en attente pour la retrouver au webhook
        Recharge::create([
            'conducteur_id'    => $conducteur->id,
            'montant'          => $request->montant,
            'type_transaction' => 'RECHARGE',
            'statut'           => 'EN_ATTENTE',
            'transaction_id'   => $response->json('token'), // Token PayDunya
        ]);

        return response()->json([
            'success'       => true,
            'payment_url'   => $response->json('response_text'), // URL de paiement
            'token'         => $response->json('token'),
        ]);
    }

    /**
     * Étape 2 : Webhook PayDunya
     * PayDunya appelle cette route automatiquement après paiement.
     * Route publique — pas de middleware auth.
     */
    public function webhook(Request $request)
    {
        // Vérification de la signature PayDunya
        $hash = $request->header('X-PAYDUNYA-SIGNATURE');
        if ($hash !== hash_hmac('sha512', $request->getContent(), config('services.paydunya.master_key'))) {
            return response()->json(['error' => 'Signature invalide.'], 403);
        }

        $data   = $request->json()->all();
        $token  = $data['data']['bill']['token'] ?? null;
        $status = $data['data']['bill']['status'] ?? null;

        if (!$token) {
            return response()->json(['error' => 'Token manquant.'], 400);
        }

        $recharge = Recharge::where('transaction_id', $token)
                            ->where('statut', 'EN_ATTENTE')
                            ->first();

        if (!$recharge) {
            return response()->json(['error' => 'Transaction introuvable.'], 404);
        }

        if ($status === 'completed') {
            DB::transaction(function () use ($recharge) {
                $recharge->update(['statut' => 'REUSSI']);
                $recharge->conducteur()->increment('solde_portefeuille', $recharge->montant);
            });
        } else {
            $recharge->update(['statut' => 'ECHOUE']);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Vérifier manuellement le statut d'un paiement
     * Utile si l'utilisateur revient sur la page sans que le webhook ait eu le temps de s'exécuter.
     */
    public function verifierStatut(Request $request, $token)
    {
        $recharge = Recharge::where('transaction_id', $token)
                            ->where('conducteur_id', $request->user()->id)
                            ->firstOrFail();

        if ($recharge->statut === 'EN_ATTENTE') {
            // On interroge PayDunya directement
            $response = Http::get(
                "https://app.paydunya.com/api/v1/checkout-invoice/confirm/{$token}",
                [],
                [
                    'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
                    'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
                    'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
                ]
            );

            if ($response->json('status') === 'completed' && $recharge->statut !== 'REUSSI') {
                DB::transaction(function () use ($recharge) {
                    $recharge->update(['statut' => 'REUSSI']);
                    $recharge->conducteur()->increment('solde_portefeuille', $recharge->montant);
                });
                $recharge->refresh();
            }
        }

        return response()->json([
            'success' => true,
            'statut'  => $recharge->statut,
            'nouveau_solde' => $recharge->conducteur->solde_portefeuille,
        ]);
    }

    public function historique(Request $request)
    {
        $historique = Recharge::where('conducteur_id', $request->user()->id)
                              ->orderBy('created_at', 'desc')
                              ->get();

        return response()->json(['success' => true, 'data' => $historique], 200);
    }
}