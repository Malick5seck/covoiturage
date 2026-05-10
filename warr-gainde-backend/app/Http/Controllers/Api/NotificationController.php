<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationEnvoyee;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // =========================================================================
    // LECTURE — liste paginée des notifications de l'utilisateur connecté
    // =========================================================================

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = Notification::where('user_id', $user->id)
                                      ->orderBy('created_at', 'desc')
                                      ->paginate(20);

        $nonLuesCount = Notification::where('user_id', $user->id)
                                    ->whereNull('date_lecture')
                                    ->count();

        return response()->json([
            'success'        => true,
            'data'           => $notifications->items(),
            'non_lues_count' => $nonLuesCount,
            'total'          => $notifications->total(),
            'current_page'   => $notifications->currentPage(),
            'last_page'      => $notifications->lastPage(),
        ], 200);
    }

    // =========================================================================
    // MARQUER UNE notification comme lue
    // =========================================================================

    public function marquerCommeLue(Request $request, $id): JsonResponse
    {
        $notification = Notification::where('id', $id)
                                     ->where('user_id', $request->user()->id)
                                     ->firstOrFail();

        if ($notification->date_lecture !== null) {
            return response()->json([
                'success' => true,
                'message' => 'Notification déjà marquée comme lue.',
                'data'    => $notification,
            ], 200);
        }

        $notification->update(['date_lecture' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Notification marquée comme lue.',
            'data'    => $notification,
        ], 200);
    }

    // =========================================================================
    // MARQUER TOUTES comme lues
    // =========================================================================

    public function marquerToutesCommeLues(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)
                              ->whereNull('date_lecture')
                              ->update(['date_lecture' => now()]);

        return response()->json([
            'success' => true,
            'message' => "{$count} notification(s) marquée(s) comme lue(s).",
            'count'   => $count,
        ], 200);
    }

    // =========================================================================
    // CRÉER une notification + broadcast temps réel
    //
    // Méthode statique appelée par tous les autres contrôleurs.
    // Le broadcast est enveloppé dans un try/catch pour ne jamais
    // bloquer le flux métier si Reverb est hors ligne.
    // =========================================================================

    public static function creer(int $userId, string $type, string $message): Notification
    {
        $notification = Notification::create([
            'user_id'           => $userId,
            'type'              => $type,
            'message'           => $message,
            'date_notification' => now(),
            'date_lecture'      => null,
        ]);

        // Broadcast WebSocket vers le canal privé de l'utilisateur
        try {
            broadcast(new NotificationEnvoyee($notification));
        } catch (\Throwable $e) {
            // Reverb hors ligne → la notif est quand même sauvegardée en BDD.
            // Ne pas faire échouer l'opération métier pour ça.
            \Illuminate\Support\Facades\Log::warning(
                "Broadcast notification échoué (user #{$userId}) : " . $e->getMessage()
            );
        }

        return $notification;
    }
}