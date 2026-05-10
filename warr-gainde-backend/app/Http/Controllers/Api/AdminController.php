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

    // 1. TABLEAU DE BORD
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

    // 2. MODÉRATION CHAUFFEURS (avec motif pour le refus)
    public function changerStatutChauffeur(Request $request, $id): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;

        $request->validate([
            'nouveau_statut' => 'required|in:VALIDE,REFUSE,SUSPENDU',
            'motif'          => 'required_if:nouveau_statut,REFUSE|nullable|string|max:500',
            'duree'          => 'nullable|integer|min:1',
        ]);

        $chauffeur = User::findOrFail($id);
        if (!$chauffeur->isConducteur()) {
            return response()->json(['success' => false, 'message' => "Cet utilisateur n'est pas un chauffeur."], 400);
        }

        $ancienStatut = $chauffeur->statut_verification;
        $chauffeur->update(['statut_verification' => $request->nouveau_statut]);

        $details = [
            'chauffeur'     => $chauffeur->prenom . ' ' . $chauffeur->nom,
            'ancien_statut' => $ancienStatut,
            'nouveau_statut'=> $request->nouveau_statut,
        ];
        if ($request->nouveau_statut === 'REFUSE') {
            $details['motif_refus'] = $request->motif;
        }
        if ($request->filled('duree')) {
            $details['duree_suspension_jours'] = $request->duree;
        }

        AdminAuditLog::log($request, 'CHANGE_DRIVER_STATUS', $details, 'User', (int) $id);

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

    // 3. SUSPENSION D'UN UTILISATEUR (passager ou autre)
    public function suspendreUtilisateur(Request $request, $id): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;

        $request->validate([
            'motif' => 'required|string|max:500',
            'duree' => 'required|integer|min:1',
        ]);

        $user = User::findOrFail($id);
        if ($user->id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Vous ne pouvez pas vous suspendre.'], 400);
        }

        $user->update(['statut_verification' => 'SUSPENDU']);

        AdminAuditLog::log($request, 'SUSPEND_USER', [
            'nom'    => $user->prenom . ' ' . $user->nom,
            'role'   => $user->role_actuel,
            'motif'  => $request->motif,
            'duree_jours' => $request->duree,
        ], 'User', (int) $id);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur suspendu.',
            'user'    => ['id' => $user->id, 'statut_verification' => $user->statut_verification],
        ]);
    }

    // 4. BANNISSEMENT (réservé Super Admin)
    public function bannirUtilisateur(Request $request, $id): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;

        $user = User::findOrFail($id);
        if ($user->id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Action impossible.'], 400);
        }

        AdminAuditLog::log($request, 'BAN_USER', [
            'nom'         => $user->prenom . ' ' . $user->nom,
            'telephone'   => $user->telephone,
            'role_actuel' => $user->role_actuel,
        ], 'User', (int) $id);

        $user->delete();
        return response()->json(['success' => true, 'message' => 'Utilisateur banni.']);
    }

    // 5. COMMISSION
    public function configurerTauxCommission(Request $request): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;
        $request->validate(['taux' => 'required|numeric|min:0|max:100']);
        $ancienTaux = Setting::where('key', 'taux_commission')->value('value');
        Setting::updateOrCreate(['key' => 'taux_commission'], ['value' => $request->taux]);
        Setting::updateOrCreate(['key' => 'taux_commission_modifie_par'], ['value' => $request->user()->id . ' — ' . now()->toDateTimeString()]);
        AdminAuditLog::log($request, 'UPDATE_COMMISSION', ['ancien_taux' => $ancienTaux, 'nouveau_taux' => $request->taux], 'Setting');
        return response()->json(['success' => true, 'message' => 'Taux mis à jour.', 'nouveau_taux' => $request->taux]);
    }

    // 6. LISTE UTILISATEURS avec recherche et filtrage
    public function getUsers(Request $request): JsonResponse
    {
        if ($response = $this->checkAdmin($request)) return $response;
        AdminAuditLog::log($request, 'VIEW_USERS');

        $query = User::orderBy('created_at', 'desc');

        if ($search = $request->input('search')) {
            $words = explode(' ', $search);
            $query->where(function ($q) use ($words) {
                foreach ($words as $word) {
                    $q->where(function ($sub) use ($word) {
                        $sub->where('prenom', 'like', "%{$word}%")
                            ->orWhere('nom', 'like', "%{$word}%")
                            ->orWhere('telephone', 'like', "%{$word}%")
                            ->orWhere('email', 'like', "%{$word}%");
                    });
                }
            });
        }

        if ($role = $request->input('role')) {
            $query->where('role_actuel', $role);
        }

        $users = $query->paginate(20);

        return response()->json([
            'success'      => true,
            'data'         => $users->items(),
            'total'        => $users->total(),
            'current_page' => $users->currentPage(),
            'last_page'    => $users->lastPage(),
        ]);
    }

    // 7. AJOUTER MODÉRATEUR
    public function ajouterModerateur(Request $request): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;
        $validatedData = $request->validate([
            'nom' => 'required|string|max:255', 'prenom' => 'required|string|max:255',
            'telephone' => 'required|string|unique:users,telephone',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);
        $moderateur = User::create([
            'nom' => $validatedData['nom'], 'prenom' => $validatedData['prenom'],
            'telephone' => $validatedData['telephone'], 'email' => $validatedData['email'],
            'password' => bcrypt($validatedData['password']),
            'role_actuel' => 'ADMIN', 'niveau_accreditation' => 'MODERATEUR',
            'statut_verification' => 'VALIDE', 'solde_portefeuille' => 0,
        ]);
        AdminAuditLog::log($request, 'CREATE_MODERATEUR', [
            'moderateur' => $moderateur->prenom . ' ' . $moderateur->nom,
            'telephone'  => $moderateur->telephone,
            'email'      => $moderateur->email,
        ], 'User', $moderateur->id);
        return response()->json(['success' => true, 'message' => 'Modérateur créé.', 'data' => $moderateur], 201);
    }

    // 8. AUDIT LOGS (recherche intégrée)
    public function getAuditLogs(Request $request): JsonResponse
    {
        if ($response = $this->checkSuperAdmin($request)) return $response;

        $query = AdminAuditLog::with('admin:id,prenom,nom,niveau_accreditation')
                              ->orderBy('created_at', 'desc');

        if ($search = $request->input('search')) {
            // Recherche par nom d'admin ou détail JSON (simplifié)
            $query->where(function ($q) use ($search) {
                $q->whereHas('admin', function ($sub) use ($search) {
                    $sub->where('prenom', 'like', "%{$search}%")
                        ->orWhere('nom', 'like', "%{$search}%");
                })->orWhere('action', 'like', "%{$search}%")
                  ->orWhere('details', 'like', "%{$search}%");
            });
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->paginate(20);

        return response()->json([
            'success'      => true,
            'data'         => $logs->items(),
            'total'        => $logs->total(),
            'current_page' => $logs->currentPage(),
            'last_page'    => $logs->lastPage(),
        ]);
    }
}