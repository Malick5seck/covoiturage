<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * INSCRIPTION (Créer un compte Passager ou Chauffeur)
     */
   public function register(Request $request)
    {
        $validatedData = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'telephone' => 'required|string|unique:users',
            'email' => 'required|string|email|unique:users',
            'password' => 'required|string|min:8',
            'role_actuel' => 'required|in:PASSAGER,CHAUFFEUR',
            
            // 🚨 L'AJOUT CRUCIAL ICI 🚨
            // Le permis est obligatoire SI le rôle est CHAUFFEUR, et il doit être unique.
            'numero_permis' => 'required_if:role_actuel,CHAUFFEUR|unique:users,numero_permis|nullable|string'
        ], [
            'numero_permis.required_if' => 'Le numéro de permis est obligatoire pour s\'inscrire en tant que chauffeur.'
        ]);

        $validatedData['password'] = bcrypt($validatedData['password']);
        
        // Par défaut, un chauffeur nouvellement inscrit est en attente de modération
        if ($validatedData['role_actuel'] === 'CHAUFFEUR') {
            $validatedData['statut_verification'] = 'EN_ATTENTE';
        }

        $user = \App\Models\User::create($validatedData);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'access_token' => $token,
            'user' => $user
        ], 201);
    }

    /**
     * CONNEXION (Login avec Téléphone)
     */
   public function login(Request $request)
    {
        $request->validate([
            'telephone' => 'required|string',
            'password' => 'required|string',
        ]);

        // ASTUCE PRO : On supprime tous les espaces du numéro pour éviter les bugs !
        $telephoneNettoye = str_replace(' ', '', $request->telephone);

        // On cherche l'utilisateur
        $user = User::where('telephone', $telephoneNettoye)->orWhere('telephone', $request->telephone)->first();

        // 1er Check : Le numéro existe-t-il ?
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'DEBUG : Le numéro ' . $request->telephone . ' n\'existe pas dans la base de données.'
            ], 401);
        }

        // 2ème Check : Le mot de passe correspond-il ?
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'DEBUG : Utilisateur trouvé, mais le mot de passe est FAUX !'
            ], 401);
        }

        // 3. Tout est bon, on donne le Token !
        $token = $user->createToken('warr_gainde_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie',
            'user' => $user,
            'token' => $token
        ], 200);
    }

    /**
     * DÉCONNEXION (Détruire le Token)
     */
    public function logout(Request $request)
    {
        // On détruit le token actuel de l'utilisateur
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie. À bientôt !'
        ], 200);
    }
    /**
     * L'utilisateur met à jour ses informations personnelles.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validatedData = $request->validate([
            'nom' => 'sometimes|required|string|max:255',
            'prenom' => 'sometimes|required|string|max:255',
            // On ignore l'ID actuel pour la règle unique
            'telephone' => 'sometimes|required|string|unique:users,telephone,' . $user->id,
            'email' => 'nullable|email|unique:users,email,' . $user->id,
        ]);

        $user->update($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour avec succès.',
            'data' => $user
        ], 200);
    }
    public function changerMotDePasse(Request $request)
    {
        $request->validate([
            'ancien_mot_de_passe' => 'required|string',
            'nouveau_mot_de_passe' => 'required|string|min:8|confirmed', // Nécessite un champ 'nouveau_mot_de_passe_confirmation'
        ]);

        $user = $request->user();

        // On vérifie que l'ancien mot de passe tapé est le bon
        if (!Hash::check($request->ancien_mot_de_passe, $user->password)) {
            return response()->json([
                'success' => false, 
                'message' => 'L\'ancien mot de passe est incorrect.'
            ], 400);
        }

        // On met à jour avec le nouveau (haché pour la sécurité)
        $user->update([
            'password' => Hash::make($request->nouveau_mot_de_passe)
        ]);

        return response()->json([
            'success' => true, 
            'message' => 'Mot de passe mis à jour avec succès.'
        ], 200);
    }
}