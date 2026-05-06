<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\NotificationController;
use App\Models\Recharge;
use App\Models\User;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RechargeController extends Controller
{
    protected $commissionService;

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    /**
     * Base API PayDunya : production (/api/v1) ou sandbox (/sandbox-api/v1).
     */
    private function paydunyaApiV1Root(): string
    {
        return config('services.paydunya.mode') === 'production'
            ? 'https://app.paydunya.com/api/v1'
            : 'https://app.paydunya.com/sandbox-api/v1';
    }

    // =========================================================================
    // ÉTAPE 1 : Initier un paiement PayDunya
    // =========================================================================

//     public function initierRecharge(Request $request)
//     {
//         $request->validate([
//             'montant' => 'required|numeric|min:500',
//         ]);

//         $conducteur = $request->user();

//         if (!$conducteur->isConducteur()) {
//             return response()->json(['success' => false, 'message' => 'Accès réservé aux chauffeurs.'], 403);
//         }

//         $reference = 'WG-' . $conducteur->id . '-' . time();

//         $response = Http::withHeaders([
//             'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
//             'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
//             'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
//         ])->post($this->paydunyaApiV1Root().'/checkout-invoice/create', [
//             'invoice' => [
//                 'total_amount' => $request->montant,
//                 'description'  => "Recharge portefeuille Warr Gaïndé — {$conducteur->prenom} {$conducteur->nom}",
//             ],
//             'store'   => ['name' => 'Warr Gaïndé'],
//             'actions' => [
//                 'cancel_url'   => config('app.frontend_url') . '/portefeuille?status=annule',
//                 'return_url'   => config('app.frontend_url') . '/portefeuille?status=succes',
//                 'callback_url' => config('app.url') . '/api/recharges/webhook',
//             ],
//             'custom_data' => [
//                 'conducteur_id' => $conducteur->id,
//                 'montant'       => $request->montant,
//                 'reference'     => $reference,
//             ],
//         ]);

//       if (!$response->successful() || $response->json('response_code') !== '00') {
//     return response()->json([
//         'success' => false,
//         'message' => 'PayDunya : ' . ($response->json('response_text') ?? $response->body()),
//         'code'    => $response->json('response_code'),
//     ], 500);
// }

//         $token = $response->json('token');

//         // On crée l'enregistrement EN_ATTENTE
//         Recharge::create([
//             'conducteur_id'    => $conducteur->id,
//             'montant'          => $request->montant,
//             'type_transaction' => 'RECHARGE',
//             'statut'           => 'EN_ATTENTE',
//             'transaction_id'   => $token,
//         ]);

//         // Construire l'URL de paiement adaptée au mode
//         $basePaymentUrl = config('services.paydunya.mode') === 'production'
//             ? 'https://app.paydunya.com/pay/'
//             : 'https://app.paydunya.com/sandbox-pay/';

//         return response()->json([
//             'success'     => true,
//             'payment_url' => $basePaymentUrl . $token,
//             'token'       => $token,
//         ], 200);
//     }
public function initierRecharge(Request $request)
{
    $request->validate([
        'montant' => 'required|numeric|min:500',
    ]);

    $conducteur = $request->user();

    if (!$conducteur->isConducteur()) {
        return response()->json(['success' => false, 'message' => 'Accès réservé aux chauffeurs.'], 403);
    }

    // 🧪 MODE SIMULATION : recharge directe sans PayDunya
    if (config('services.paydunya.mode') === 'simuler') {
        $tokenSimulation = 'SIMU-' . $conducteur->id . '-' . now()->timestamp;
        
        // On crée l'enregistrement EN_ATTENTE
        Recharge::create([
            'conducteur_id'    => $conducteur->id,
            'montant'          => $request->montant,
            'type_transaction' => 'RECHARGE',
            'statut'           => 'EN_ATTENTE',
            'transaction_id'   => $tokenSimulation,
        ]);

        // On valide immédiatement (crédite le portefeuille)
        $this->validerLaRecharge($tokenSimulation);

        return response()->json([
            'success'     => true,
            'message'     => 'Recharge simulée réussie.',
            'payment_url' => config('app.frontend_url') . '/portefeuille?status=simule',
            'token'       => $tokenSimulation,
        ], 200);
    }

    // ================= MODE NORMAL (PAYDUNYA) =================
    $reference = 'WG-' . $conducteur->id . '-' . time();

    $response = Http::withHeaders([
        'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
        'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
        'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
    ])->post($this->paydunyaApiV1Root().'/checkout-invoice/create', [
        'invoice' => [
            'total_amount' => $request->montant,
            'description'  => "Recharge portefeuille Warr Gaïndé — {$conducteur->prenom} {$conducteur->nom}",
        ],
        'store'   => ['name' => 'Warr Gaïndé'],
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

    if (!$response->successful() || $response->json('response_code') !== '00') {
        return response()->json([
            'success' => false,
            'message' => 'Erreur PayDunya : ' . ($response->json('response_text') ?? $response->body()),
        ], 500);
    }

    $token = $response->json('token');

    Recharge::create([
        'conducteur_id'    => $conducteur->id,
        'montant'          => $request->montant,
        'type_transaction' => 'RECHARGE',
        'statut'           => 'EN_ATTENTE',
        'transaction_id'   => $token,
    ]);

    $basePaymentUrl = config('services.paydunya.mode') === 'production'
        ? 'https://app.paydunya.com/pay/'
        : 'https://app.paydunya.com/sandbox-pay/';

    return response()->json([
        'success'     => true,
        'payment_url' => $basePaymentUrl . $token,
        'token'       => $token,
    ], 200);
}

    // =========================================================================
    // ÉTAPE 2 : Webhook & ÉTAPE 3 : Vérification manuelle
    // =========================================================================

    public function webhook(Request $request)
    {
        $signatureRecue = $request->header('X-PAYDUNYA-SIGNATURE');
        $signatureAttendue = hash_hmac('sha512', $request->getContent(), config('services.paydunya.master_key'));

        if (!$signatureRecue || !hash_equals($signatureAttendue, $signatureRecue)) {
            return response()->json(['error' => 'Signature invalide.'], 403);
        }

        $data  = $request->json()->all();
        $token = $data['data']['bill']['token'] ?? null;
        $status = $data['data']['bill']['status'] ?? null;

        if ($token && $status === 'completed') {
            $this->validerLaRecharge($token);
        }

        return response()->json(['success' => true], 200);
    }

    public function verifierStatut(Request $request, $token)
    {
        $recharge = Recharge::where('transaction_id', $token)
                            ->where('conducteur_id', $request->user()->id)
                            ->firstOrFail();

        if ($recharge->statut !== 'EN_ATTENTE') {
            return $this->responseStatut($recharge);
        }

        // Appel direct à PayDunya pour confirmation
        $response = Http::withHeaders([
            'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
            'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
            'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
        ])->get($this->paydunyaApiV1Root()."/checkout-invoice/confirm/{$token}");

        if ($response->successful() && $response->json('status') === 'completed') {
            $this->validerLaRecharge($token);
            $recharge->refresh();
        } elseif (in_array($response->json('status'), ['cancelled', 'failed'])) {
            $recharge->update(['statut' => 'ECHOUE']);
        }

        return $this->responseStatut($recharge);
    }

    /**
     * Logique de validation commune (Webhook + Manuel)
     */
    private function validerLaRecharge(string $token)
    {
        $recharge = Recharge::where('transaction_id', $token)
                            ->where('statut', 'EN_ATTENTE')
                            ->first();

        if ($recharge) {
            DB::transaction(function () use ($recharge) {
                // Verrouiller l'utilisateur pour éviter toute modification concurrente
                $conducteur = User::where('id', $recharge->conducteur_id)
                                  ->lockForUpdate()
                                  ->firstOrFail();

                // Créditer le solde (sans créer une nouvelle ligne)
                $conducteur->increment('solde_portefeuille', $recharge->montant);

                // Marquer la recharge PayDunya comme réussie
                $recharge->update(['statut' => 'REUSSI']);
            });

            NotificationController::creer(
                $recharge->conducteur_id,
                'RECHARGE_EFFECTUEE',
                "✅ Votre recharge de " . number_format($recharge->montant, 0, ',', ' ') . " FCFA est confirmée."
            );
        }
    }

    private function responseStatut($recharge)
    {
        return response()->json([
            'success'       => true,
            'statut'        => $recharge->statut,
            'nouveau_solde' => (float) $recharge->conducteur->solde_portefeuille,
        ], 200);
    }
    
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