<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * INSCRIPTION (Passager ou Chauffeur)
     */
    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'nom'           => 'required|string|max:255',
            'prenom'        => 'required|string|max:255',
            'telephone'     => 'required|string|unique:users',
            'email'         => 'required|string|email|unique:users',
            'password'      => 'required|string|min:8',
            'role_actuel'   => 'required|in:PASSAGER,CHAUFFEUR',
            'numero_permis' => 'required_if:role_actuel,CHAUFFEUR|unique:users,numero_permis|nullable|string',
        ], [
            'numero_permis.required_if' => 'Le numéro de permis est obligatoire pour s\'inscrire en tant que chauffeur.',
        ]);

        $validatedData['password'] = bcrypt($validatedData['password']);

        if ($validatedData['role_actuel'] === 'CHAUFFEUR') {
            $validatedData['statut_verification'] = 'EN_ATTENTE';
        }

        $user  = User::create($validatedData);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    /**
     * CONNEXION — Supporte téléphone OU email
     */
   public function login(Request $request)
{
    $request->validate([
        'identifiant' => 'required|string',
        'password'    => 'required|string',
    ]);

    $identifiant = trim($request->input('identifiant'));

    // Si le champ contient un @, c'est un email, sinon un téléphone
    if (filter_var($identifiant, FILTER_VALIDATE_EMAIL)) {
        $user = User::where('email', $identifiant)->first();
    } else {
        $telephoneNettoye = str_replace(' ', '', $identifiant);
        $user = User::where('telephone', $telephoneNettoye)
                    ->orWhere('telephone', $identifiant)
                    ->first();
    }

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'success' => false,
            'message' => 'Identifiants incorrects.',
        ], 401);
    }

    $token = $user->createToken('warr_gainde_token')->plainTextToken;

    return response()->json([
        'success' => true,
        'message' => 'Connexion réussie',
        'user'    => $user,
        'token'   => $token,
    ], 200);
}

    /**
     * DÉCONNEXION
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie. À bientôt !',
        ], 200);
    }

    /**
     * MISE À JOUR DU PROFIL
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validatedData = $request->validate([
            'nom'       => 'sometimes|required|string|max:255',
            'prenom'    => 'sometimes|required|string|max:255',
            'telephone' => 'sometimes|required|string|unique:users,telephone,' . $user->id,
            'email'     => 'nullable|email|unique:users,email,' . $user->id,
        ]);

        $user->update($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour avec succès.',
            'data'    => $user,
        ], 200);
    }

    /**
     * CHANGEMENT DE MOT DE PASSE
     */
    public function changerMotDePasse(Request $request)
    {
        $request->validate([
            'ancien_mot_de_passe'  => 'required|string',
            'nouveau_mot_de_passe' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->ancien_mot_de_passe, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'L\'ancien mot de passe est incorrect.',
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->nouveau_mot_de_passe),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe mis à jour avec succès.',
        ], 200);
    }
}