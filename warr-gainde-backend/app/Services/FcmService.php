<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FcmService
{
    private string $serverKey;

    public function __construct()
    {
        $this->serverKey = config('services.fcm.server_key');
    }

    /**
     * Envoie une notification push à un token FCM.
     */
    public function send(string $token, string $title, string $body): bool
    {
        $response = Http::withHeaders([
            'Authorization' => 'key=' . $this->serverKey,
            'Content-Type'  => 'application/json',
        ])->post('https://fcm.googleapis.com/fcm/send', [
            'to'           => $token,
            'notification' => [
                'title' => $title,
                'body'  => $body,
            ],
        ]);

        return $response->successful();
    }
}