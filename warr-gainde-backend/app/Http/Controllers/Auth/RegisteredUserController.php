<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Validation stricte des données reçues du frontend
        $request->validate([
            'prenom' => ['required', 'string', 'max:255'],
            'nom' => ['required', 'string', 'max:255'],
            'telephone' => ['required', 'string', 'unique:'.User::class],
            'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role_actuel' => ['required', 'string', 'in:PASSAGER,CHAUFFEUR'],
            // Le permis est requis UNIQUEMENT si le rôle est CHAUFFEUR
            'numero_permis' => ['required_if:role_actuel,CHAUFFEUR', 'nullable', 'string', 'max:50'],
        ]);

        // 2. Création de l'utilisateur avec son statut de validation
        $user = User::create([
            'prenom' => $request->prenom,
            'nom' => $request->nom,
            'telephone' => $request->telephone,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role_actuel,
            'numero_permis' => $request->numero_permis,
            // Par défaut, le chauffeur n'est pas validé, le passager l'est
            'is_validated' => ($request->role_actuel === 'PASSAGER'), 
        ]);

        event(new Registered($user));

        // 3. Authentification automatique
        Auth::login($user);

        // 4. Génération du token (si tu utilises Sanctum)
        $token = $user->createToken('auth_token')->plainTextToken;

        // On renvoie une réponse JSON complète pour React
        return response()->json([
            'success' => true,
            'message' => 'Inscription réussie',
            'user' => $user,
            'token' => $token
        ], 201);
    }
}