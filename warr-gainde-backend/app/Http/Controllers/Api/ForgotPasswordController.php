<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    /**
     * Demande de lien de réinitialisation par e-mail (broker Laravel).
     */
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

        $status = Password::broker()->sendResetLink(['email' => $user->email]);

        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json([
                'success' => false,
                'message' => $this->translatePasswordStatus($status),
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Si un compte existe pour cet e-mail, un lien de réinitialisation vient d\'être envoyé.',
        ]);
    }

    private function translatePasswordStatus(string $status): string
    {
        return match ($status) {
            Password::INVALID_USER => 'Aucun compte ne correspond à cet e-mail.',
            Password::RESET_THROTTLED => 'Veuillez patienter avant de redemander un lien.',
            default => 'Impossible d\'envoyer le lien pour le moment.',
        };
    }
}
