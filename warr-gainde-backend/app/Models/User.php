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
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'prenom' => ['required', 'string', 'max:255'],
            'nom' => ['required', 'string', 'max:255'],
            'telephone' => ['required', 'string', 'max:20', 'unique:'.User::class],
            'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role_actuel' => ['required', 'string', 'in:PASSAGER,CHAUFFEUR'],
            // Required only if the user is a driver
            'numero_permis' => ['required_if:role_actuel,CHAUFFEUR', 'nullable', 'string', 'max:50'],
        ]);

        $user = User::create([
            'prenom' => $request->prenom,
            'nom' => $request->nom,
            'telephone' => $request->telephone,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_actuel' => $request->role_actuel,
            'numero_permis' => $request->numero_permis,
            
            // Logic mapping directly to your User model's specific fields
            'statut_verification' => ($request->role_actuel === 'CHAUFFEUR') ? 'EN_ATTENTE' : 'VERIFIE',
            'solde_portefeuille' => 0,
            'photo_profil' => null, // Will be updated in the next step
            'niveau_accreditation' => 'DEBUTANT', 
        ]);

        event(new Registered($user));

        Auth::login($user);

        // Assuming Sanctum is used as per your User model
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration successful',
            'user' => $user,
            'token' => $token,
            // Flag to tell React to prompt for a photo upload
            'requires_photo' => true 
        ], 201);
    }
}