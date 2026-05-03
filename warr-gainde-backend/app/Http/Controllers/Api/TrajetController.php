<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

    /**
     * Recherche et liste des trajets disponibles.
     * Accessible sans authentification (passagers non inscrits peuvent consulter).
     */
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

    /**
     * Détails d'un trajet spécifique.
     */
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

    /**
     * Publier un nouveau trajet.
     * Seul un CHAUFFEUR validé peut publier.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // Sécurité : seul un chauffeur validé peut publier
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

        // Sécurité : le véhicule doit appartenir à ce chauffeur
        $vehicule = Vehicule::where('id', $request->vehicule_id)
                            ->where('conducteur_id', $user->id)
                            ->first();

        if (!$vehicule) {
            return response()->json([
                'success' => false,
                'message' => 'Ce véhicule est introuvable ou ne vous appartient pas.',
            ], 403);
        }

        // Récupérer le taux de commission actuel depuis la table settings
        $tauxActuel = (float) (Setting::where('key', 'taux_commission')->value('value') ?? 5);

        $dateHeureDepart = $request->date_depart . ' ' . $request->heure_depart;

        $trajet = Trajet::create([
            'conducteur_id'           => $user->id,
            'vehicule_id'             => $vehicule->id,
            'ville_depart'            => $request->ville_depart,
            'ville_arrivee'           => $request->ville_arrivee,
            'date_heure_depart'       => $dateHeureDepart,
            'prix_par_place'          => $request->prix_place,
            'nombre_places_totales'   => $vehicule->nombre_places_max,
            'places_disponibles'      => $vehicule->nombre_places_max,
            'statut'                  => 'EN_ATTENTE',
            // Taux figé au moment de la création pour audit (même si l'admin change le taux après)
            'taux_commission_applique' => $tauxActuel,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Votre trajet a été publié avec le véhicule {$vehicule->immatriculation}. Taux de commission appliqué : {$tauxActuel}%.",
            'data'    => $trajet,
        ], 201);
    }

    /**
     * Historique des trajets publiés par le conducteur connecté.
     */
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

    /**
     * Démarrer le trajet (le jour J).
     */
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
            'statut'            => 'EN_COURS',
            'heure_depart_reelle' => now(),
        ]);

        // TODO Étape 3 : notifier les passagers acceptés que le trajet a démarré

        return response()->json([
            'success' => true,
            'message' => 'Bonne route ! Le trajet a démarré.',
            'data'    => $trajet,
        ], 200);
    }

    /**
     * Terminer le trajet + PRÉLÈVEMENT RÉEL de la commission + ARCHIVAGE GPS.
     */
    public function terminerTrajet(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($trajet->statut !== 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'Seul un trajet EN_COURS peut être terminé.',
            ], 400);
        }

        return DB::transaction(function () use ($trajet) {

            // 1. Mettre à jour le statut et l'heure d'arrivée réelle
            $trajet->update([
                'statut'               => 'TERMINE',
                'heure_arrivee_reelle' => now(),
            ]);

            // 🟢 ARCHIVAGE IMMÉDIAT DES POSITIONS GPS AJOUTÉ ICI
            PositionGps::archiverPourTrajet($trajet->id);

            // 2. Calculer les places occupées et le montant total généré
            $placesOccupees = $trajet->nombre_places_totales - $trajet->places_disponibles;

            if ($placesOccupees <= 0) {
                // Aucun passager = aucune commission à prélever
                return response()->json([
                    'success' => true,
                    'message' => 'Trajet terminé. Aucune commission prélevée (aucun passager).',
                    'statut'  => 'TERMINE',
                    'commission_prelevee' => 0,
                ], 200);
            }

            // 3. Calculer la commission avec le taux FIGÉ à la création du trajet
            $commission = $this->commissionService->calculer(
                $trajet->prix_par_place,
                $placesOccupees,
                $trajet->taux_commission_applique
            );

            // 4. PRÉLEVER RÉELLEMENT
            $nouveauSolde = $this->commissionService->prelever(
                $trajet->conducteur_id,
                $trajet->id,
                $commission
            );

            // TODO Étape 3 : notifier les passagers que le trajet est terminé

            return response()->json([
                'success'             => true,
                'message'             => "Trajet terminé ! Commission de {$commission} FCFA prélevée (taux : {$trajet->taux_commission_applique}%).",
                'statut'              => 'TERMINE',
                'commission_prelevee' => $commission,
                'nouveau_solde'       => $nouveauSolde,
                'places_occupees'     => $placesOccupees,
            ], 200);
        });
    }

    /**
     * Annuler le trajet (urgence/panne) avec annulation en cascade des réservations.
     */
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

            $trajet->update(['statut' => 'ANNULE']);

            // Annulation en cascade de toutes les réservations actives
            $trajet->reservations()
                   ->whereIn('statut', ['EN_ATTENTE', 'ACCEPTEE'])
                   ->update(['statut' => 'ANNULEE', 'motif_annulation' => 'Trajet annulé par le conducteur']);

            // TODO Étape 3 : notifier tous les passagers concernés

            return response()->json([
                'success' => true,
                'message' => 'Le trajet a été annulé et toutes les réservations ont été mises à jour.',
            ], 200);
        });
    }

    /**
     * Feuille de route : liste des passagers acceptés pour un trajet.
     * Accessible uniquement au conducteur du trajet ou à un admin.
     */
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

    /**
     * Ajouter un passager manuellement (pris en route sans l'application).
     */
    public function ajouterPassagerManuel(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
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

    /**
     * Libérer une place (passager descendu en route).
     */
    public function libererPlaceManuelle(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
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