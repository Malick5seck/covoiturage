<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class ResetPasswordController extends Controller
{
    /**
     * Réinitialisation via token reçu par e-mail.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'message' => 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => $this->translatePasswordStatus($status),
        ], 400);
    }

    private function translatePasswordStatus(string $status): string
    {
        return match ($status) {
            Password::INVALID_TOKEN => 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.',
            Password::INVALID_USER => 'Aucun compte ne correspond à cet e-mail.',
            Password::RESET_THROTTLED => 'Veuillez patienter avant de réessayer.',
            default => 'La réinitialisation a échoué. Vérifiez vos informations.',
        };
    }
}
