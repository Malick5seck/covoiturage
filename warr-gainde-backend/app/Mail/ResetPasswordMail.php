<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $resetUrl,
        public string $prenom,
        public int    $expireMinutes = 5
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Modification de votre mot de passe — Warr Gaïndé',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    private function buildHtml(): string
    {
        return '
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Réinitialisation de mot de passe</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #333;">Bonjour ' . e($this->prenom) . ',</h2>
                <p style="font-size: 16px; line-height: 1.5;">
                    Vous avez demandé la réinitialisation de votre mot de passe sur la plateforme <strong>Warr Gaïndé</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.5;">
                    Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                </p>
                <a href="' . e($this->resetUrl) . '"
                   style="display: inline-block; padding: 12px 24px; margin: 20px 0;
                          background-color: #fbbf24; color: #1e293b; font-weight: bold;
                          text-decoration: none; border-radius: 8px;">
                    Réinitialiser mon mot de passe
                </a>
                <p style="font-size: 14px; color: #666;">
                    ⚠️ Ce lien expirera dans <strong>' . $this->expireMinutes . ' minute(s)</strong>.
                </p>
                <p style="font-size: 14px; color: #666;">
                    Si vous n\'avez pas fait cette demande, vous pouvez ignorer cet email en toute sécurité.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">
                    L\'équipe Warr Gaïndé
                </p>
            </div>
        </body>
        </html>';
    }
}