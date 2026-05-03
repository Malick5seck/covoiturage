<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\NotificationController;
use App\Models\Recharge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RechargeController extends Controller
{
    // =========================================================================
    // ÉTAPE 1 : Initier un paiement PayDunya
    // =========================================================================

    /**
     * Le chauffeur demande à recharger son portefeuille.
     * On crée une facture PayDunya et on retourne l'URL de paiement au frontend.
     */
    public function initierRecharge(Request $request)
    {
        $request->validate([
            'montant' => 'required|numeric|min:500',
        ]);

        $conducteur = $request->user();

        // Sécurité : seul un chauffeur peut recharger son portefeuille
        if (!$conducteur->isConducteur()) {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les chauffeurs peuvent recharger leur portefeuille.',
            ], 403);
        }

        // Référence unique pour retrouver la transaction au webhook
        $reference = 'WG-' . $conducteur->id . '-' . time();

        // =====================================================================
        // Appel à l'API PayDunya pour créer la facture
        // =====================================================================
        $response = Http::withHeaders([
            'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
            'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
            'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
        ])->post('https://app.paydunya.com/api/v1/checkout-invoice/create', [
            'invoice' => [
                'total_amount' => $request->montant,
                'description'  => "Recharge portefeuille Warr Gaïndé — {$conducteur->prenom} {$conducteur->nom}",
            ],
            'store' => [
                'name' => 'Warr Gaïndé',
            ],
            'actions' => [
                'cancel_url'   => config('app.frontend_url') . '/portefeuille?status=annule',
                'return_url'   => config('app.frontend_url') . '/portefeuille?status=succes',
                'callback_url' => config('app.url') . '/api/recharges/webhook',
            ],
            'custom_data' => [
                'conducteur_id' => $conducteur->id,
                'montant'       => $request->montant,
                'reference'     => $reference,
            ],
        ]);

        // Vérification que PayDunya a répondu correctement
        if (!$response->successful() || $response->json('response_code') !== '00') {
            Log::error('PayDunya initiation échouée', [
                'conducteur_id' => $conducteur->id,
                'montant'       => $request->montant,
                'response'      => $response->json(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'initier le paiement. Veuillez réessayer.',
            ], 500);
        }

        $token       = $response->json('token');
        $paymentUrl  = $response->json('response_text');

        // Créer la recharge EN_ATTENTE pour la retrouver au webhook
        Recharge::create([
            'conducteur_id'    => $conducteur->id,
            'trajet_id'        => null,
            'montant'          => $request->montant,
            'type_transaction' => 'RECHARGE',
            'statut'           => 'EN_ATTENTE',
            'transaction_id'   => $token,
        ]);

        return response()->json([
            'success'     => true,
            'payment_url' => $paymentUrl,
            'token'       => $token,
        ], 200);
    }

    // =========================================================================
    // ÉTAPE 2 : Webhook PayDunya
    // =========================================================================

    /**
     * PayDunya appelle cette route automatiquement après paiement.
     * Route publique — pas de middleware auth.
     *
     * SÉCURITÉ : Vérification de la signature HMAC avant tout traitement.
     */
    public function webhook(Request $request)
    {
        // 1. Vérification de la signature PayDunya
        $signatureRecue = $request->header('X-PAYDUNYA-SIGNATURE');
        $signatureAttendue = hash_hmac(
            'sha512',
            $request->getContent(),
            config('services.paydunya.master_key')
        );

        if (!$signatureRecue || !hash_equals($signatureAttendue, $signatureRecue)) {
            Log::warning('Webhook PayDunya : signature invalide', [
                'ip'        => $request->ip(),
                'signature' => $signatureRecue,
            ]);

            return response()->json(['error' => 'Signature invalide.'], 403);
        }

        // 2. Extraire les données utiles
        $data   = $request->json()->all();
        $token  = $data['data']['bill']['token']  ?? null;
        $status = $data['data']['bill']['status'] ?? null;

        if (!$token) {
            return response()->json(['error' => 'Token manquant.'], 400);
        }

        // 3. Retrouver la recharge en attente
        $recharge = Recharge::where('transaction_id', $token)
                            ->where('statut', 'EN_ATTENTE')
                            ->first();

        if (!$recharge) {
            // La recharge est peut-être déjà traitée (double appel webhook)
            Log::info('Webhook PayDunya : transaction introuvable ou déjà traitée', [
                'token' => $token,
            ]);

            return response()->json(['success' => true, 'info' => 'Transaction déjà traitée.'], 200);
        }

        // 4. Traiter selon le statut PayDunya
        if ($status === 'completed') {
            DB::transaction(function () use ($recharge) {
                $recharge->update(['statut' => 'REUSSI']);
                $recharge->conducteur()->increment('solde_portefeuille', $recharge->montant);
            });

            // Notifier le chauffeur que sa recharge est confirmée
            NotificationController::creer(
                $recharge->conducteur_id,
                'RECHARGE_EFFECTUEE',
                "✅ Votre recharge de " . number_format($recharge->montant, 0, ',', ' ')
                . " FCFA a été créditée sur votre portefeuille Warr Gaïndé."
            );

            Log::info('Recharge confirmée via webhook', [
                'conducteur_id' => $recharge->conducteur_id,
                'montant'       => $recharge->montant,
                'token'         => $recharge->transaction_id,
            ]);
        } else {
            // Paiement échoué ou annulé
            $recharge->update(['statut' => 'ECHOUE']);

            Log::info('Recharge échouée via webhook', [
                'conducteur_id' => $recharge->conducteur_id,
                'statut_paydunya' => $status,
                'token'         => $recharge->transaction_id,
            ]);
        }

        return response()->json(['success' => true], 200);
    }

    // =========================================================================
    // ÉTAPE 3 : Vérification manuelle du statut
    // =========================================================================

    /**
     * Utile si l'utilisateur revient sur la page sans que le webhook
     * ait eu le temps de s'exécuter (connexion lente, délai PayDunya).
     *
     * Le frontend appelle cette route avec le token récupéré au retour
     * de la page de paiement PayDunya.
     */
    public function verifierStatut(Request $request, $token)
    {
        $recharge = Recharge::where('transaction_id', $token)
                            ->where('conducteur_id', $request->user()->id)
                            ->firstOrFail();

        // Si déjà traité (par le webhook), on retourne directement
        if ($recharge->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success'       => true,
                'statut'        => $recharge->statut,
                'nouveau_solde' => (float) $recharge->conducteur->solde_portefeuille,
            ], 200);
        }

        // Interroger PayDunya directement pour connaître le statut réel
        $response = Http::withHeaders([
            'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
            'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
            'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
        ])->get("https://app.paydunya.com/api/v1/checkout-invoice/confirm/{$token}");

        if (!$response->successful()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de vérifier le statut auprès de PayDunya.',
                'statut'  => $recharge->statut,
            ], 503);
        }

        $statusPaydunya = $response->json('status');

        if ($statusPaydunya === 'completed') {
            DB::transaction(function () use ($recharge) {
                $recharge->update(['statut' => 'REUSSI']);
                $recharge->conducteur()->increment('solde_portefeuille', $recharge->montant);
            });

            // Notifier le chauffeur (au cas où le webhook n'a pas pu le faire)
            NotificationController::creer(
                $recharge->conducteur_id,
                'RECHARGE_EFFECTUEE',
                "✅ Votre recharge de " . number_format($recharge->montant, 0, ',', ' ')
                . " FCFA a été créditée sur votre portefeuille Warr Gaïndé."
            );

            $recharge->refresh();

        } elseif (in_array($statusPaydunya, ['cancelled', 'failed'])) {
            $recharge->update(['statut' => 'ECHOUE']);
            $recharge->refresh();
        }

        // Recharger la relation conducteur pour avoir le solde à jour
        $recharge->load('conducteur');

        return response()->json([
            'success'       => true,
            'statut'        => $recharge->statut,
            'nouveau_solde' => (float) $recharge->conducteur->solde_portefeuille,
        ], 200);
    }

    // =========================================================================
    // HISTORIQUE
    // =========================================================================

    /**
     * Historique complet des transactions du conducteur connecté.
     * Inclut recharges ET prélèvements de commission.
     */
    public function historique(Request $request)
    {
        $conducteur = $request->user();

        if (!$conducteur->isConducteur()) {
            return response()->json([
                'success' => false,
                'message' => 'Accès réservé aux chauffeurs.',
            ], 403);
        }

        $historique = Recharge::where('conducteur_id', $conducteur->id)
                              ->orderBy('created_at', 'desc')
                              ->get();

        // Calcul du solde total reçu et prélevé pour le résumé
        $totalRecharge    = $historique->where('type_transaction', 'RECHARGE')
                                       ->where('statut', 'REUSSI')
                                       ->sum('montant');

        $totalPrelevement = $historique->where('type_transaction', 'PRELEVEMENT')
                                       ->where('statut', 'REUSSI')
                                       ->sum('montant');

        return response()->json([
            'success' => true,
            'data'    => $historique,
            'resume'  => [
                'solde_actuel'      => (float) $conducteur->solde_portefeuille,
                'total_recharge'    => (float) $totalRecharge,
                'total_prelevement' => (float) $totalPrelevement,
            ],
        ], 200);
    }
}