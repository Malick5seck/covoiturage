<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FcmService
{
    private string $serverKey;
    private string $projectId;

    public function __construct()
    {
        $this->serverKey = config('services.fcm.server_key');
        // Le Project ID Firebase est déjà dans ton .env côté frontend, on le lit ici (tu peux le stocker dans une variable d'env backend aussi)
        $this->projectId = 'Warr-Gainde'; // ← ton Project ID Firebase
    }

    /**
     * Envoie une notification push à un token FCM via l'API HTTP v1.
     */
    public function send(string $token, string $title, string $body): bool
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->serverKey,
            'Content-Type'  => 'application/json',
        ])->post("https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send", [
            'message' => [
                'token'        => $token,
                'notification' => [
                    'title' => $title,
                    'body'  => $body,
                ],
            ],
        ]);

        return $response->successful();
    }
}