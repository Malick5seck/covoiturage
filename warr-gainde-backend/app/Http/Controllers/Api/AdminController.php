<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Trajet;
use App\Models\Recharge;
use App\Models\Setting;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    // =========================================================================
    // SÉCURITÉ GLOBALE
    // =========================================================================

    /**
     * Vérifie que l'utilisateur connecté est bien un ADMIN ou MODERATEUR.
     * Appelé en tête de chaque méthode sensible.
     */
    private function checkAdmin(Request $request): void
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            abort(403, 'Accès refusé. Réservé aux administrateurs.');
        }
    }

    /**
     * Vérifie que c'est spécifiquement un SUPER_ADMIN.
     * Utilisé pour les actions sensibles : commission, création modérateur.
     */
    private function checkSuperAdmin(Request $request): void
    {
        if (!$request->user() || !$request->user()->isSuperAdmin()) {
            abort(403, 'Accès refusé. Réservé au Super Administrateur.');
        }
    }

    // =========================================================================
    // 1. TABLEAU DE BORD
    // =========================================================================

    /**
     * Statistiques globales pour les cartes du Dashboard Admin React.
     */
    public function getDashboardStats(Request $request)
    {
        $this->checkAdmin($request);

        $stats = [
            'total_utilisateurs'        => User::count(),
            'total_chauffeurs'          => User::where('role_actuel', 'CHAUFFEUR')->count(),
            'total_passagers'           => User::where('role_actuel', 'PASSAGER')->count(),
            'chauffeurs_en_attente'     => User::where('role_actuel', 'CHAUFFEUR')
                                               ->where('statut_verification', 'EN_ATTENTE')
                                               ->count(),
            'chauffeurs_valides'        => User::where('role_actuel', 'CHAUFFEUR')
                                               ->where('statut_verification', 'VALIDE')
                                               ->count(),
            'trajets_en_cours'          => Trajet::where('statut', 'EN_COURS')->count(),
            'trajets_termines'          => Trajet::where('statut', 'TERMINE')->count(),
            'chiffre_affaires_plateforme' => Recharge::where('type_transaction', 'PRELEVEMENT')
                                                      ->where('statut', 'REUSSI')
                                                      ->sum('montant'),
            // Taux actuel configuré
            'taux_commission_actuel'    => Setting::where('key', 'taux_commission')->value('value') ?? '5',
        ];

        return response()->json([
            'success' => true,
            'data'    => $stats,
        ], 200);
    }

    // =========================================================================
    // 2. MODÉRATION CHAUFFEURS
    // =========================================================================

    /**
     * Valider, refuser ou suspendre un chauffeur.
     * Accessible aux ADMIN et MODERATEUR.
     */
    public function changerStatutChauffeur(Request $request, $id)
    {
        $this->checkAdmin($request);

        $request->validate([
            'nouveau_statut' => 'required|in:VALIDE,REFUSE,SUSPENDU',
        ]);

        $chauffeur = User::findOrFail($id);

        if (!$chauffeur->isConducteur()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet utilisateur n\'est pas un chauffeur.',
            ], 400);
        }

        $ancienStatut = $chauffeur->statut_verification;
        $chauffeur->update(['statut_verification' => $request->nouveau_statut]);

        // TODO Étape 3 : Déclencher une notification au chauffeur
        // event(new StatutChauffeurChange($chauffeur, $ancienStatut, $request->nouveau_statut));

        return response()->json([
            'success'  => true,
            'message'  => 'Le statut du chauffeur a été mis à jour avec succès.',
            'chauffeur' => [
                'id'                  => $chauffeur->id,
                'prenom'              => $chauffeur->prenom,
                'nom'                 => $chauffeur->nom,
                'statut_verification' => $chauffeur->statut_verification,
            ],
        ], 200);
    }

    // =========================================================================
    // 3. BANNISSEMENT
    // =========================================================================

    /**
     * Soft Delete d'un utilisateur dangereux.
     * L'historique des transactions reste intact pour la comptabilité.
     */
    public function bannirUtilisateur(Request $request, $id)
    {
        $this->checkAdmin($request);

        $user = User::findOrFail($id);

        // Un admin ne peut pas se bannir lui-même
        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Action impossible : vous ne pouvez pas vous bannir vous-même.',
            ], 400);
        }

        // Un modérateur ne peut pas bannir un autre admin
        if ($user->isAdmin() && !$request->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Seul le Super Administrateur peut bannir un autre administrateur.',
            ], 403);
        }

        $user->delete(); // SoftDelete — conserve l'historique

        return response()->json([
            'success' => true,
            'message' => 'L\'utilisateur a été banni de la plateforme.',
        ], 200);
    }

    // =========================================================================
    // 4. COMMISSION — CORRIGÉ : écrit en BDD, pas dans un fichier JSON
    // =========================================================================

    /**
     * Configure le taux de commission global de la plateforme.
     *
     * BUG CORRIGÉ : L'ancienne version écrivait dans storage/settings_commission.json
     * mais terminerTrajet() lisait dans la table `settings`.
     * Les deux écrivaient/lisaient à des endroits différents = taux jamais appliqué.
     *
     * CORRECTION : On utilise exclusivement la table `settings` (déjà migrée).
     * Accessible uniquement au SUPER_ADMIN.
     */
    public function configurerTauxCommission(Request $request)
    {
        $this->checkSuperAdmin($request);

        $request->validate([
            'taux' => 'required|numeric|min:0|max:100',
        ]);

        // Upsert dans la table settings (clé unique 'taux_commission')
        Setting::updateOrCreate(
            ['key' => 'taux_commission'],
            ['value' => $request->taux]
        );

        // On log aussi qui a fait la modification pour l'audit
        Setting::updateOrCreate(
            ['key' => 'taux_commission_modifie_par'],
            ['value' => $request->user()->id . ' — ' . now()->toDateTimeString()]
        );

        return response()->json([
            'success'      => true,
            'message'      => 'Le taux de commission a été mis à jour pour toute la plateforme.',
            'nouveau_taux' => $request->taux,
        ], 200);
    }

    // =========================================================================
    // 5. LISTE DES UTILISATEURS
    // =========================================================================

    /**
     * Récupère tous les utilisateurs pour le tableau de bord admin.
     * Inclut une pagination légère pour éviter les timeouts.
     */
    public function getUsers(Request $request)
    {
        $this->checkAdmin($request);

        $users = User::orderBy('created_at', 'desc')
                     ->paginate(50); // 50 par page pour éviter de tout charger

        return response()->json([
            'success' => true,
            'data'    => $users->items(),
            'total'   => $users->total(),
            'current_page' => $users->currentPage(),
            'last_page'    => $users->lastPage(),
        ], 200);
    }

    // =========================================================================
    // 6. AJOUTER UN MODÉRATEUR
    // =========================================================================

    /**
     * Crée un compte Modérateur pour l'équipe de gestion.
     * Réservé exclusivement au Super Admin.
     */
    public function ajouterModerateur(Request $request)
    {
        $this->checkSuperAdmin($request);

        $validatedData = $request->validate([
            'nom'       => 'required|string|max:255',
            'prenom'    => 'required|string|max:255',
            'telephone' => 'required|string|unique:users,telephone',
            'email'     => 'required|string|email|unique:users,email',
            'password'  => 'required|string|min:8',
        ]);

        $moderateur = User::create([
            'nom'                  => $validatedData['nom'],
            'prenom'               => $validatedData['prenom'],
            'telephone'            => $validatedData['telephone'],
            'email'                => $validatedData['email'],
            'password'             => bcrypt($validatedData['password']),
            'role_actuel'          => 'ADMIN',
            'niveau_accreditation' => 'MODERATEUR',
            'statut_verification'  => 'VALIDE',
            'solde_portefeuille'   => 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Le compte Modérateur a été créé avec succès.',
            'data'    => [
                'id'                  => $moderateur->id,
                'prenom'              => $moderateur->prenom,
                'nom'                 => $moderateur->nom,
                'telephone'           => $moderateur->telephone,
                'email'               => $moderateur->email,
                'role_actuel'         => $moderateur->role_actuel,
                'niveau_accreditation' => $moderateur->niveau_accreditation,
            ],
        ], 201);
    }
}