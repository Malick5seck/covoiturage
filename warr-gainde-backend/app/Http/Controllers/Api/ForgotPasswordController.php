<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $request->input('email'))->first();

        if (! $user) {
            return response()->json([
                'success' => true,
                'message' => 'Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\'être envoyé.',
            ]);
        }

        // Générer le token manuellement
        $token = Password::broker()->createToken($user);

        // Construire l'URL de réinitialisation
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        $resetUrl = "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($user->email);

        // Envoyer l'email DIRECTEMENT (sans notification)
        Mail::to($user->email)->send(new ResetPasswordMail(
            resetUrl:      $resetUrl,
            prenom:        $user->prenom ?? 'Utilisateur',
            expireMinutes: (int) config('auth.passwords.users.expire', 5),
        ));

        return response()->json([
            'success' => true,
            'message' => 'Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\'être envoyé.',
        ]);
    }
}