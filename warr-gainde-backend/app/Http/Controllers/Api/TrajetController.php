<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\NotificationController;
use App\Models\Setting;
use App\Models\Trajet;
use App\Models\Vehicule;
use App\Models\Reservation;
use App\Models\PositionGps;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrajetController extends Controller
{
    private CommissionService $commissionService;

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    // =========================================================================
    // ROUTES PUBLIQUES
    // =========================================================================

    public function index(Request $request)
    {
        $query = Trajet::with(['conducteur:id,nom,prenom,photo_profil,note_moyenne', 'vehicule'])
                       ->where('statut', 'EN_ATTENTE')
                       ->where('places_disponibles', '>', 0);

        if ($request->filled('ville_depart')) {
            $query->where('ville_depart', 'like', '%' . $request->ville_depart . '%');
        }

        if ($request->filled('ville_arrivee')) {
            $query->where('ville_arrivee', 'like', '%' . $request->ville_arrivee . '%');
        }

        if ($request->filled('date')) {
            $query->whereDate('date_heure_depart', $request->date);
        }

        $trajets = $query->orderBy('date_heure_depart', 'asc')->get();

        return response()->json([
            'success' => true,
            'data'    => $trajets,
        ], 200);
    }

    public function show($id)
    {
        $trajet = Trajet::with([
            'conducteur:id,nom,prenom,photo_profil,note_moyenne,statut_verification',
            'vehicule',
            'reservations',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $trajet,
        ], 200);
    }

    // =========================================================================
    // ACTIONS CONDUCTEUR
    // =========================================================================

    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isConducteur()) {
            return response()->json([
                'success' => false,
                'message' => 'Seul un chauffeur peut publier un trajet.',
            ], 403);
        }

        if (!$user->estValide()) {
            return response()->json([
                'success' => false,
                'message' => 'Votre compte est en attente de validation. Vous ne pouvez pas encore publier de trajets.',
            ], 403);
        }

        $request->validate([
            'ville_depart'  => 'required|string|max:255',
            'ville_arrivee' => 'required|string|max:255',
            'date_depart'   => 'required|date|after_or_equal:today',
            'heure_depart'  => 'required',
            'prix_place'    => 'required|numeric|min:500',
            'vehicule_id'   => 'required|exists:vehicules,id',
        ]);

        $vehicule = Vehicule::where('id', $request->vehicule_id)
                            ->where('conducteur_id', $user->id)
                            ->first();

        if (!$vehicule) {
            return response()->json([
                'success' => false,
                'message' => 'Ce véhicule est introuvable ou ne vous appartient pas.',
            ], 403);
        }

        $tauxActuel = (float) (Setting::where('key', 'taux_commission')->value('value') ?? 5);

        // =====================================================================
        // VÉRIFICATION DU SOLDE CÔTÉ BACKEND
        // Commission maximale théorique = prix * places_max * taux
        // On bloque si le solde ne couvre pas ce pire cas.
        // =====================================================================
        $commissionMax = round(
            $request->prix_place * $vehicule->nombre_places_max * ($tauxActuel / 100),
            2
        );

        if ((float) $user->solde_portefeuille < $commissionMax) {
            return response()->json([
                'success' => false,
                'message' => "Solde insuffisant. La commission maximale pour ce trajet (véhicule complet) est de {$commissionMax} FCFA. "
                           . "Votre solde actuel : {$user->solde_portefeuille} FCFA. "
                           . "Rechargez votre portefeuille avant de publier.",
                'solde_actuel'       => (float) $user->solde_portefeuille,
                'commission_max'     => $commissionMax,
            ], 422);
        }

        $dateHeureDepart = $request->date_depart . ' ' . $request->heure_depart;

        $trajet = Trajet::create([
            'conducteur_id'            => $user->id,
            'vehicule_id'              => $vehicule->id,
            'ville_depart'             => $request->ville_depart,
            'ville_arrivee'            => $request->ville_arrivee,
            'date_heure_depart'        => $dateHeureDepart,
            'prix_par_place'           => $request->prix_place,
            'nombre_places_totales'    => $vehicule->nombre_places_max,
            'places_disponibles'       => $vehicule->nombre_places_max,
            'statut'                   => 'EN_ATTENTE',
            'taux_commission_applique' => $tauxActuel,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Votre trajet a été publié avec le véhicule {$vehicule->immatriculation}. Taux de commission appliqué : {$tauxActuel}%.",
            'data'    => $trajet,
        ], 201);
    }

    public function mesTrajets(Request $request)
    {
        $trajets = Trajet::with(['vehicule', 'reservations'])
                         ->where('conducteur_id', $request->user()->id)
                         ->orderBy('date_heure_depart', 'desc')
                         ->get();

        return response()->json([
            'success' => true,
            'data'    => $trajets,
        ], 200);
    }

    // =========================================================================
    // DÉMARRER — Notifie tous les passagers ACCEPTÉS
    // =========================================================================

    public function demarrerTrajet(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($trajet->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Ce trajet ne peut plus être démarré (statut : ' . $trajet->statut . ').',
            ], 400);
        }

        $trajet->update([
            'statut'              => 'EN_COURS',
            'heure_depart_reelle' => now(),
        ]);

        // =====================================================================
        // NOTIFICATION : Passagers acceptés — le trajet vient de démarrer
        // =====================================================================
        $passagersAcceptes = Reservation::where('trajet_id', $trajet->id)
                                        ->where('statut', 'ACCEPTEE')
                                        ->pluck('passager_id');

        foreach ($passagersAcceptes as $passagerId) {
            NotificationController::creer(
                $passagerId,
                'DEPART_IMMINENT',
                "🚗 Votre trajet {$trajet->ville_depart} → {$trajet->ville_arrivee} vient de démarrer. "
                . "Bon voyage !"
            );
        }

        return response()->json([
            'success'             => true,
            'message'             => 'Bonne route ! Le trajet a démarré.',
            'passagers_notifies'  => $passagersAcceptes->count(),
            'data'                => $trajet,
        ], 200);
    }

    // =========================================================================
    // TERMINER — Commission + GPS + Notifie tous les passagers ACCEPTÉS
    // =========================================================================

    public function terminerTrajet(Request $request, $id)
{
    $trajet = Trajet::findOrFail($id);

    // ... vérifications d'accès et de statut ...

    return DB::transaction(function () use ($trajet) {

        // 1. Mettre à jour le statut et l'heure d'arrivée
        $trajet->update([
            'statut'               => 'TERMINE',
            'heure_arrivee_reelle' => now(),
        ]);

        // 2. Archiver les positions GPS (la colonne statut_trajet existe bien)
        PositionGps::archiverPourTrajet($trajet->id);

        // 3. Passagers acceptés à notifier
        $passagersAcceptes = Reservation::where('trajet_id', $trajet->id)
                                        ->where('statut', 'ACCEPTEE')
                                        ->pluck('passager_id');

        // 4. Places occupées
        $placesOccupees = $trajet->nombre_places_totales - $trajet->places_disponibles;

        if ($placesOccupees <= 0) {
            return response()->json([
                'success'             => true,
                'message'             => 'Trajet terminé. Aucune commission prélevée (aucun passager).',
                'statut'              => 'TERMINE',
                'commission_prelevee' => 0,
            ], 200);
        }

        // 5. Calculer la commission
        $commission = $this->commissionService->calculer(
            $trajet->prix_par_place,
            $placesOccupees,
            $trajet->taux_commission_applique
        );

        // 6. Prélèvement SÉCURISÉ
        try {
            $nouveauSolde = $this->commissionService->prelever(
                $trajet->conducteur_id,
                $trajet->id,
                $commission
            );
        } catch (\Exception $e) {
            // Le solde est insuffisant, on empêche la terminaison propre
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 402); // 402 Payment Required
        }

        // 7. Notifications aux passagers acceptés
        foreach ($passagersAcceptes as $passagerId) {
            NotificationController::creer(
                $passagerId,
                'ARRIVEE',
                "🏁 Vous êtes arrivé à destination ! Votre trajet {$trajet->ville_depart} → {$trajet->ville_arrivee} est terminé. N'oubliez pas d'évaluer votre conducteur."
            );
        }

        return response()->json([
            'success'             => true,
            'message'             => "Trajet terminé ! Commission de {$commission} FCFA prélevée (taux : {$trajet->taux_commission_applique}%).",
            'statut'              => 'TERMINE',
            'commission_prelevee' => $commission,
            'nouveau_solde'       => $nouveauSolde,
            'places_occupees'     => $placesOccupees,
            'passagers_notifies'  => $passagersAcceptes->count(),
        ], 200);
    });
}
    // =========================================================================
    // ANNULER — Cascade réservations + Notifie tous les passagers concernés
    // =========================================================================

    public function annulerTrajet(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {

            $trajet = Trajet::findOrFail($id);

            if ($trajet->conducteur_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if ($trajet->statut === 'TERMINE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible d\'annuler un trajet déjà terminé.',
                ], 400);
            }

            // 1. Récupérer les passagers à notifier AVANT l'annulation en cascade
            //    On notifie ceux EN_ATTENTE et ACCEPTEE (les deux sont impactés)
            $passagersANotifier = Reservation::where('trajet_id', $trajet->id)
                                             ->whereIn('statut', ['EN_ATTENTE', 'ACCEPTEE'])
                                             ->pluck('passager_id');

            // 2. Passer le trajet en ANNULE
            $trajet->update(['statut' => 'ANNULE']);

            // 3. Annulation en cascade de toutes les réservations actives
            $trajet->reservations()
                   ->whereIn('statut', ['EN_ATTENTE', 'ACCEPTEE'])
                   ->update([
                       'statut'            => 'ANNULEE',
                       'motif_annulation'  => 'Trajet annulé par le conducteur',
                   ]);

            // =====================================================================
            // NOTIFICATION : Tous les passagers concernés (EN_ATTENTE + ACCEPTEE)
            // =====================================================================
            foreach ($passagersANotifier as $passagerId) {
                NotificationController::creer(
                    $passagerId,
                    'ANNULATION',
                    "⚠️ Le trajet {$trajet->ville_depart} → {$trajet->ville_arrivee} prévu le "
                    . \Carbon\Carbon::parse($trajet->date_heure_depart)->format('d/m/Y à H:i')
                    . " a été annulé par le conducteur. Votre réservation a été automatiquement annulée."
                );
            }

            return response()->json([
                'success'            => true,
                'message'            => 'Le trajet a été annulé et toutes les réservations ont été mises à jour.',
                'passagers_notifies' => $passagersANotifier->count(),
            ], 200);
        });
    }

    // =========================================================================
    // UTILITAIRES CONDUCTEUR
    // =========================================================================

    public function listePassagers(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $reservations = $trajet->reservations()
                               ->with('passager:id,nom,prenom,telephone,photo_profil')
                               ->where('statut', 'ACCEPTEE')
                               ->get();

        return response()->json([
            'success' => true,
            'message' => 'Feuille de route du trajet',
            'data'    => $reservations,
        ], 200);
    }

    public function ajouterPassagerManuel(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);
        $user   = $request->user();

        if ($trajet->conducteur_id !== $user->id || $user->role_actuel !== 'CHAUFFEUR') {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $request->validate(['nombre_places' => 'required|integer|min:1']);

        if ($trajet->places_disponibles < $request->nombre_places) {
            return response()->json([
                'success' => false,
                'message' => 'Pas assez de places disponibles.',
            ], 400);
        }

        $trajet->decrement('places_disponibles', $request->nombre_places);

        return response()->json([
            'success'          => true,
            'message'          => "{$request->nombre_places} place(s) retirée(s) manuellement.",
            'places_restantes' => $trajet->fresh()->places_disponibles,
        ], 200);
    }

    public function libererPlaceManuelle(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);
        $user   = $request->user();

        if ($trajet->conducteur_id !== $user->id || $user->role_actuel !== 'CHAUFFEUR') {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $request->validate(['nombre_places' => 'required|integer|min:1']);

        if ($trajet->places_disponibles + $request->nombre_places > $trajet->nombre_places_totales) {
            return response()->json([
                'success' => false,
                'message' => 'Le véhicule est déjà à capacité maximale.',
            ], 400);
        }

        $trajet->increment('places_disponibles', $request->nombre_places);

        return response()->json([
            'success'          => true,
            'message'          => 'Place(s) libérée(s) avec succès.',
            'places_restantes' => $trajet->fresh()->places_disponibles,
        ], 200);
    }
}