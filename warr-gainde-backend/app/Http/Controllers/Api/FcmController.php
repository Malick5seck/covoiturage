<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FcmController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => 'required|string',
            'platform' => 'nullable|string|in:web,android,ios',
        ]);

        $user = $request->user();

        // On enregistre ou on met à jour le token (un même appareil peut renvoyer le même token)
        $user->fcmTokens()->updateOrCreate(
            ['token' => $request->token],
            ['platform' => $request->platform ?? 'web']
        );

        return response()->json(['success' => true, 'message' => 'Token enregistré.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['token' => 'required|string']);

        $user = $request->user();
        $user->fcmTokens()->where('token', $request->token)->delete();

        return response()->json(['success' => true, 'message' => 'Token supprimé.']);
    }
}