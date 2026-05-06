<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PhonePasswordReset;
use App\Models\User;
use App\Services\SmsSender;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PhonePasswordResetController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    private const RESET_WINDOW_MINUTES = 10;

    private const MAX_OTP_ATTEMPTS = 5;

    public function __construct(
        private SmsSender $smsSender
    ) {}

    private function resolveUserByTelephone(Request $request): ?User
    {
        $normalized = PhoneNumber::normalize($request->input('telephone'));

        return User::query()
            ->where('telephone', $normalized)
            ->orWhere('telephone', $request->input('telephone'))
            ->first();
    }

    /**
     * Envoi d'un code OTP par SMS.
     */
    public function forgotPhone(Request $request)
    {
        $request->validate([
            'telephone' => ['required', 'string'],
        ]);

        $user = $this->resolveUserByTelephone($request);

        if (! $user) {
            return response()->json([
                'success' => true,
                'message' => 'Si un compte existe pour ce numéro, un code vient d\'être envoyé par SMS.',
            ]);
        }

        PhonePasswordReset::query()
            ->where('telephone', $user->telephone)
            ->whereNull('verified_at')
            ->delete();

        $otp = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        PhonePasswordReset::create([
            'user_id' => $user->id,
            'telephone' => $user->telephone,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'attempts' => 0,
        ]);

        try {
            $this->smsSender->send(
                PhoneNumber::toE164($user->telephone),
                'Warr Gaïndé — Code de réinitialisation : '.$otp.'. Valide '.self::OTP_TTL_MINUTES.' min. Ne partagez ce code avec personne.'
            );
        } catch (\Throwable $e) {
            PhonePasswordReset::query()
                ->where('telephone', $user->telephone)
                ->whereNull('verified_at')
                ->latest()
                ->first()
                ?->delete();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'success' => true,
            'message' => 'Si un compte existe pour ce numéro, un code vient d\'être envoyé par SMS.',
        ]);
    }

    /**
     * Vérification du code OTP.
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'telephone' => ['required', 'string'],
            'otp' => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
        ]);

        $user = $this->resolveUserByTelephone($request);
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Code invalide ou expiré.',
            ], 422);
        }

        $record = PhonePasswordReset::query()
            ->where('user_id', $user->id)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $record || $record->attempts >= self::MAX_OTP_ATTEMPTS) {
            return response()->json([
                'success' => false,
                'message' => 'Code invalide ou trop de tentatives. Demandez un nouveau code.',
            ], 422);
        }

        if (! Hash::check($request->input('otp'), $record->otp_hash)) {
            $record->increment('attempts');

            return response()->json([
                'success' => false,
                'message' => 'Code incorrect.',
            ], 422);
        }

        $record->update([
            'verified_at' => now(),
            'reset_expires_at' => now()->addMinutes(self::RESET_WINDOW_MINUTES),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Code vérifié. Vous pouvez définir un nouveau mot de passe.',
        ]);
    }

    /**
     * Nouveau mot de passe après OTP validé.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'telephone' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $this->resolveUserByTelephone($request);
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Session de réinitialisation expirée ou invalide. Recommencez depuis la demande de code.',
            ], 422);
        }

        $record = PhonePasswordReset::query()
            ->where('user_id', $user->id)
            ->whereNotNull('verified_at')
            ->where('reset_expires_at', '>', now())
            ->latest()
            ->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => 'Session de réinitialisation expirée ou invalide. Recommencez depuis la demande de code.',
            ], 422);
        }

        $user = User::findOrFail($record->user_id);
        $user->forceFill(['password' => $request->input('password')])->save();

        PhonePasswordReset::query()
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.',
        ]);
    }
}
