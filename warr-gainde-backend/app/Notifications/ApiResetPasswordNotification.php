<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApiResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(public string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $base = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        $email = urlencode($notifiable->getEmailForPasswordReset());
        $url = "{$base}/reset-password?token={$this->token}&email={$email}";

        return (new MailMessage)
            ->subject('Réinitialisation du mot de passe — Warr Gaïndé')
            ->line('Vous recevez cet e-mail car une demande de réinitialisation de mot de passe a été faite pour votre compte.')
            ->action('Choisir un nouveau mot de passe', $url)
            ->line('Ce lien expire dans '.(int) config('auth.passwords.users.expire', 60).' minutes.')
            ->line('Si vous n\'êtes pas à l\'origine de cette demande, aucune action n\'est requise.');
    }
}
