<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use App\Models\Trajet;
use App\Models\Recharge;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    // =========================================================================
    // HELPERS DE SÉCURITÉ
    // =========================================================================

    private function checkAdmin(Request $request): ?JsonResponse
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Réservé aux administrateurs.',
            ], 403);
        }
        return null;
    }

    private function checkSuperAdmin(Request $request): ?JsonResponse
    {
        if (!$request->user() || !$request->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Réservé au Super Administrateur.',
            ], 403);
        }
        return null;
    }

    // =========================================================================
    // 1. TABLEAU DE BORD
    // =========================================================================

    public function getDashboardStats(Request $request): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;

        AdminAuditLog::log($request, 'VIEW_STATS');

        $stats = [
            'total_utilisateurs'        => User::count(),
            'total_chauffeurs'          => User::where('role_actuel', 'CHAUFFEUR')->count(),
            'total_passagers'           => User::where('role_actuel', 'PASSAGER')->count(),
            'chauffeurs_en_attente'     => User::where('role_actuel', 'CHAUFFEUR')
                                               ->where('statut_verification', 'EN_ATTENTE')->count(),
            'chauffeurs_valides'        => User::where('role_actuel', 'CHAUFFEUR')
                                               ->where('statut_verification', 'VALIDE')->count(),
            'trajets_en_cours'          => Trajet::where('statut', 'EN_COURS')->count(),
            'trajets_termines'          => Trajet::where('statut', 'TERMINE')->count(),
            'chiffre_affaires_plateforme' => Recharge::where('type_transaction', 'PRELEVEMENT')
                                                      ->where('statut', 'REUSSI')
                                                      ->sum('montant'),
            'taux_commission_actuel'    => Setting::where('key', 'taux_commission')->value('value') ?? '5',
        ];

        return response()->json(['success' => true, 'data' => $stats]);
    }

    // =========================================================================
    // 2. MODÉRATION CHAUFFEURS
    // =========================================================================

    public function changerStatutChauffeur(Request $request, $id): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;

        $request->validate([
            'nouveau_statut' => 'required|in:VALIDE,REFUSE,SUSPENDU',
        ]);

        $chauffeur = User::findOrFail($id);

        if (!$chauffeur->isConducteur()) {
            return response()->json([
                'success' => false,
                'message' => "Cet utilisateur n'est pas un chauffeur.",
            ], 400);
        }

        $ancienStatut = $chauffeur->statut_verification;
        $chauffeur->update(['statut_verification' => $request->nouveau_statut]);

        AdminAuditLog::log($request, 'CHANGE_DRIVER_STATUS', [
            'chauffeur_nom'   => $chauffeur->prenom . ' ' . $chauffeur->nom,
            'ancien_statut'   => $ancienStatut,
            'nouveau_statut'  => $request->nouveau_statut,
        ], 'User', (int) $id);

        return response()->json([
            'success'   => true,
            'message'   => 'Statut du chauffeur mis à jour.',
            'chauffeur' => [
                'id'                  => $chauffeur->id,
                'prenom'              => $chauffeur->prenom,
                'nom'                 => $chauffeur->nom,
                'statut_verification' => $chauffeur->statut_verification,
            ],
        ]);
    }

    // =========================================================================
    // 3. BANNISSEMENT
    // =========================================================================

    public function bannirUtilisateur(Request $request, $id): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;

        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Action impossible : vous ne pouvez pas vous bannir.',
            ], 400);
        }

        if ($user->isAdmin() && !$request->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Seul le Super Administrateur peut bannir un admin.',
            ], 403);
        }

        AdminAuditLog::log($request, 'BAN_USER', [
            'nom'         => $user->prenom . ' ' . $user->nom,
            'telephone'   => $user->telephone,
            'role_actuel' => $user->role_actuel,
        ], 'User', (int) $id);

        $user->delete(); // SoftDelete

        return response()->json([
            'success' => true,
            'message' => "L'utilisateur a été banni de la plateforme.",
        ]);
    }

    // =========================================================================
    // 4. COMMISSION
    // =========================================================================

    public function configurerTauxCommission(Request $request): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;

        $request->validate([
            'taux' => 'required|numeric|min:0|max:100',
        ]);

        $ancienTaux = Setting::where('key', 'taux_commission')->value('value');

        Setting::updateOrCreate(
            ['key' => 'taux_commission'],
            ['value' => $request->taux]
        );
        Setting::updateOrCreate(
            ['key' => 'taux_commission_modifie_par'],
            ['value' => $request->user()->id . ' — ' . now()->toDateTimeString()]
        );

        AdminAuditLog::log($request, 'UPDATE_COMMISSION', [
            'ancien_taux'   => $ancienTaux,
            'nouveau_taux'  => $request->taux,
        ], 'Setting');

        return response()->json([
            'success'      => true,
            'message'      => 'Taux de commission mis à jour.',
            'nouveau_taux' => $request->taux,
        ]);
    }

    // =========================================================================
    // 5. LISTE DES UTILISATEURS
    // =========================================================================

    public function getUsers(Request $request): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;

        AdminAuditLog::log($request, 'VIEW_USERS');

        $users = User::orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success'      => true,
            'data'         => $users->items(),
            'total'        => $users->total(),
            'current_page' => $users->currentPage(),
            'last_page'    => $users->lastPage(),
        ]);
    }

    // =========================================================================
    // 6. AJOUTER UN MODÉRATEUR
    // =========================================================================

    public function ajouterModerateur(Request $request): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;

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

        AdminAuditLog::log($request, 'CREATE_MODERATEUR', [
            'moderateur_nom'       => $moderateur->prenom . ' ' . $moderateur->nom,
            'moderateur_telephone' => $moderateur->telephone,
            'moderateur_email'     => $moderateur->email,
        ], 'User', $moderateur->id);

        return response()->json([
            'success' => true,
            'message' => 'Compte Modérateur créé.',
            'data'    => [
                'id'                   => $moderateur->id,
                'prenom'               => $moderateur->prenom,
                'nom'                  => $moderateur->nom,
                'telephone'            => $moderateur->telephone,
                'email'                => $moderateur->email,
                'role_actuel'          => $moderateur->role_actuel,
                'niveau_accreditation' => $moderateur->niveau_accreditation,
            ],
        ], 201);
    }

    // =========================================================================
    // 7. AUDIT LOG — réservé Super Admin uniquement
    // =========================================================================

    public function getAuditLogs(Request $request): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;

        $query = AdminAuditLog::with('admin:id,prenom,nom,niveau_accreditation')
                              ->orderBy('created_at', 'desc');

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('admin_id')) {
            $query->where('admin_id', $request->admin_id);
        }
        if ($request->filled('date_debut')) {
            $query->whereDate('created_at', '>=', $request->date_debut);
        }
        if ($request->filled('date_fin')) {
            $query->whereDate('created_at', '<=', $request->date_fin);
        }

        $logs = $query->paginate(30);

        return response()->json([
            'success'      => true,
            'data'         => $logs->items(),
            'total'        => $logs->total(),
            'current_page' => $logs->currentPage(),
            'last_page'    => $logs->lastPage(),
        ]);
    }
}