<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsSender
{
    public function send(string $e164To, string $body): void
    {
        $sid = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from = config('services.twilio.from');

        if ($sid && $token && $from) {
            $url = sprintf(
                'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json',
                $sid
            );

            $response = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->post($url, [
                    'To' => $e164To,
                    'From' => $from,
                    'Body' => $body,
                ]);

            if ($response->failed()) {
                Log::error('Twilio SMS failed', [
                    'to' => $e164To,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException('Échec d\'envoi du SMS. Réessayez plus tard.');
            }

            return;
        }

        Log::info('SMS (dev / sans Twilio)', ['to' => $e164To, 'message' => $body]);
    }
}
