<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Models\Trajet;
use App\Models\Recharge;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Sécurité globale : Vérifie que l'utilisateur connecté est bien un ADMIN.
     */
    private function checkAdmin(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            abort(403, 'Accès refusé. Réservé aux administrateurs.');
        }
    }

    /**
     * 1. TABLEAU DE BORD (Statistiques globales de l'application)
     */
    public function getDashboardStats(Request $request)
    {
        $this->checkAdmin($request);

        // On rassemble les chiffres clés pour l'interface React de l'Admin
        $stats = [
            'total_utilisateurs' => User::count(),
            'chauffeurs_en_attente' => User::where('role_actuel', 'CHAUFFEUR')->where('statut_verification', 'EN_ATTENTE')->count(),
            'trajets_en_cours' => Trajet::where('statut', 'EN_COURS')->count(),
            'chiffre_affaires_plateforme' => Recharge::where('type_transaction', 'PRELEVEMENT')->where('statut', 'REUSSI')->sum('montant')
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ], 200);
    }

    /**
     * 2. MODÉRATION : Valider, refuser ou suspendre un chauffeur
     */
    public function changerStatutChauffeur(Request $request, $id)
    {
        $this->checkAdmin($request);

        $request->validate([
            'nouveau_statut' => 'required|in:VALIDE,REFUSE,SUSPENDU'
        ]);

        $chauffeur = User::findOrFail($id);

        if (!$chauffeur->isConducteur()) {
            return response()->json(['success' => false, 'message' => 'Cet utilisateur n\'est pas un chauffeur.'], 400);
        }

        $chauffeur->update([
            'statut_verification' => $request->nouveau_statut
        ]);

        // (Optionnel) Ici, on pourrait utiliser le NotificationService pour envoyer un SMS "Votre profil a été validé !"

        return response()->json([
            'success' => true,
            'message' => 'Le statut du chauffeur a été mis à jour avec succès.',
            'chauffeur' => $chauffeur
        ], 200);
    }

    /**
     * 3. BANNISSEMENT : Supprimer (Soft Delete) un utilisateur dangereux
     */
    public function bannirUtilisateur(Request $request, $id)
    {
        $this->checkAdmin($request);

        $user = User::findOrFail($id);

        // Un admin ne peut pas se bannir lui-même
        if ($user->id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Action impossible.'], 400);
        }

        // Le SoftDelete fait son travail : l'utilisateur disparaît de l'application, 
        // mais ses trajets et paiements passés restent dans la base pour la comptabilité.
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'L\'utilisateur a été banni de la plateforme.'
        ], 200);
    }

    /**
     * 4. COMMISSION : Configurer le taux de la plateforme
     */
    public function configurerTauxCommission(Request $request)
    {
        // 1. On vérifie que c'est bien un Admin
        $this->checkAdmin($request);

        // 2. On valide que le taux est un nombre logique (entre 0% et 100%)
        $request->validate([
            'taux' => 'required|numeric|min:0|max:100'
        ]);

        // 3. L'ASTUCE : On sauvegarde ce chiffre dans un petit fichier JSON sur le serveur
        Storage::disk('local')->put('settings_commission.json', json_encode([
            'taux' => $request->taux,
            'mis_a_jour_par' => $request->user()->id,
            'date' => now()
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Le taux de commission a été mis à jour pour toute la plateforme.',
            'nouveau_taux' => $request->taux
        ], 200);
    }

    /**
     * 5. LISTER : Récupérer tous les utilisateurs pour le tableau
     */
    public function getUsers(Request $request)
    {
        $this->checkAdmin($request);

        $users = User::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ], 200);
    }

    /**
     * 6. SUPER ADMIN : Ajouter un Modérateur à l'équipe
     */
    public function ajouterModerateur(Request $request)
    {
        // On s'assure que c'est bien le Super Admin qui fait la requête
        $this->checkAdmin($request);

        // Validation des données du nouveau modérateur
        $validatedData = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'telephone' => 'required|string|unique:users',
            'email' => 'required|string|email|unique:users',
            'password' => 'required|string|min:8',
        ]);

        // Sécurisation du mot de passe et assignation du rôle strict
        $validatedData['password'] = bcrypt($validatedData['password']);
        $validatedData['role_actuel'] = 'MODERATEUR'; 

        // Création en base de données
        $moderateur = User::create($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Le compte Modérateur a été créé avec succès.',
            'data' => $moderateur
        ], 201);
    }
}