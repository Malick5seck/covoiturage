<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{

    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::where('user_id', $user->id)
                                      ->orderBy('created_at', 'desc')
                                      ->get();

        $nonLuesCount = $notifications->whereNull('date_lecture')->count();

        return response()->json([
            'success'        => true,
            'data'           => $notifications,
            'non_lues_count' => $nonLuesCount,
        ], 200);
    }

   
    public function marquerCommeLue(Request $request, $id)
    {
        $notification = Notification::where('id', $id)
                                     ->where('user_id', $request->user()->id)
                                     ->firstOrFail();

        // Si déjà lue, on ne fait rien (idempotent)
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


    public function marquerToutesCommeLues(Request $request)
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

    public static function creer(int $userId, string $type, string $message): Notification
    {
        return Notification::create([
            'user_id'          => $userId,
            'type'             => $type,
            'message'          => $message,
            'date_notification' => now(),
            'date_lecture'     => null, // Non lue par défaut
        ]);
    }
}