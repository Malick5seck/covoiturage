<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trajet;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrajetController extends Controller
{
    /**
     * Affiche et RECHERCHE les trajets disponibles.
     */
    public function index(Request $request)
    {
        $query = Trajet::with(['conducteur', 'vehicule'])
                       ->where('statut', 'EN_ATTENTE')
                       ->where('places_disponibles', '>', 0);

        // Filtre : Ville de départ
        if ($request->has('ville_depart')) {
            $query->where('ville_depart', 'like', '%' . $request->ville_depart . '%');
        }

        // Filtre : Ville d'arrivée
        if ($request->has('ville_arrivee')) {
            $query->where('ville_arrivee', 'like', '%' . $request->ville_arrivee . '%');
        }

        // Filtre : Date (ex: "2026-04-25")
        if ($request->has('date')) {
            $query->whereDate('date_heure_depart', $request->date);
        }

        $trajets = $query->orderBy('date_heure_depart', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Résultats de la recherche.',
            'data' => $trajets
        ], 200);
    }

    /**
     * Publier un nouveau trajet (Action du Conducteur).
     */
   /**
     * Publier un nouveau trajet (Action du Conducteur).
     */
   /**
     * Publier un nouveau trajet (Action du Conducteur).
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // 1. Validation : On EXIGE maintenant l'ID du véhicule
        $request->validate([
            'ville_depart' => 'required|string',
            'ville_arrivee' => 'required|string',
            'date_depart' => 'required|date',
            'heure_depart' => 'required',
            'prix_place' => 'required|numeric|min:500',
            'vehicule_id' => 'required|exists:vehicules,id' // 👈 La voiture DOIT exister
        ]);

        // 2. Sécurité : On s'assure que le véhicule appartient bien à ce chauffeur
        $vehicule = \App\Models\Vehicule::where('id', $request->vehicule_id)
                                        ->where('conducteur_id', $user->id)
                                        ->first();

        if (!$vehicule) {
            return response()->json(['success' => false, 'message' => 'Ce véhicule est introuvable ou ne vous appartient pas.'], 403);
        }

        // 3. Fusion date/heure
        $dateHeureDepart = $request->date_depart . ' ' . $request->heure_depart;

        // 4. Création avec les VRAIES données de la voiture
        $trajet = Trajet::create([
            'conducteur_id' => $user->id,
            'vehicule_id' => $vehicule->id, // On lie la vraie voiture
            'ville_depart' => $request->ville_depart,
            'ville_arrivee' => $request->ville_arrivee,
            'date_heure_depart' => $dateHeureDepart,
            'prix_par_place' => $request->prix_place,
            'nombre_places_totales' => $vehicule->nombre_places_max, // 👈 Capacité réelle
            'places_disponibles' => $vehicule->nombre_places_max, // 👈 Capacité réelle
            'statut' => 'EN_ATTENTE',
            'taux_commission_applique' => 5.00,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Votre trajet a été publié avec le véhicule ' . $vehicule->immatriculation,
            'data' => $trajet
        ], 201);
    }
    /**
     * Afficher les détails d'un trajet spécifique.
     */
    public function show($id)
    {
        $trajet = Trajet::with(['conducteur', 'vehicule', 'reservations'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $trajet
        ], 200);
    }

    /**
     * CHAUFFEUR : Terminer le trajet (Arrivée) & Prélèvement Commission dynamique
     */
    public function terminerTrajet(Request $request, $id)
    {
        $trajet = \App\Models\Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        // 1. On passe le statut à TERMINE
        $trajet->update(['statut' => 'TERMINE']);

        // 2. Calcul du montant total généré
        $placesOccupees = $trajet->nombre_places_totales - $trajet->places_disponibles;
        $montantTotal = $placesOccupees * $trajet->prix_par_place;

        // 3. Récupération du taux dynamique (Table settings)
        // Par défaut, on applique 5% si l'admin n'a rien configuré
        $tauxAdmin = \App\Models\Setting::where('key', 'taux_commission')->value('value'); 
        $tauxDecimal = $tauxAdmin ? ($tauxAdmin / 100) : 0.05; 

        // 4. Calcul de la part de Warr Gaïndé
        $commission = $montantTotal * $tauxDecimal;

        // Appel de ton service pour débiter le portefeuille du chauffeur
        // app(\App\Services\CommissionService::class)->prelever($trajet->conducteur_id, $commission);

        return response()->json([
            'success' => true, 
            'message' => "Trajet terminé ! Commission de {$commission} FCFA prélevée selon le taux en vigueur.",
            'statut' => 'TERMINE'
        ], 200);
    }
    /**
     * HISTORIQUE : Les trajets publiés par le chauffeur connecté
     */
    public function mesTrajets(Request $request)
    {
        $trajets = Trajet::with(['vehicule', 'reservations'])
                         ->where('conducteur_id', $request->user()->id)
                         ->orderBy('date_heure_depart', 'desc')
                         ->get();

        return response()->json(['success' => true, 'data' => $trajets], 200);
    }

    /**
     * CYCLE DE VIE : Le chauffeur démarre le trajet (Le jour J)
     */
    public function demarrerTrajet(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($trajet->statut !== 'EN_ATTENTE') {
            return response()->json(['success' => false, 'message' => 'Ce trajet ne peut plus être démarré.'], 400);
        }

        $trajet->update([
            'statut' => 'EN_COURS',
            'heure_depart_reelle' => now()
        ]);

        return response()->json(['success' => true, 'message' => 'Bonne route ! Le trajet a démarré.', 'data' => $trajet], 200);
    }

    /**
     * CYCLE DE VIE : Le chauffeur annule le trajet (Urgence/Panne)
     */
    public function annulerTrajet(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $trajet = Trajet::findOrFail($id);

            if ($trajet->conducteur_id !== $request->user()->id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
            }

            if ($trajet->statut === 'TERMINE') {
                return response()->json(['success' => false, 'message' => 'Impossible d\'annuler un trajet terminé.'], 400);
            }

            $trajet->update(['statut' => 'ANNULE']);

            // CASCADE : On annule automatiquement toutes les réservations liées !
            $trajet->reservations()->whereIn('statut', ['EN_ATTENTE', 'ACCEPTEE'])->update(['statut' => 'ANNULEE']);

            return response()->json(['success' => true, 'message' => 'Le trajet a été annulé avec succès.'], 200);
        });
    }
    /**
     * Le chauffeur prend quelqu'un sur la route (sans l'application)
     */
    public function ajouterPassagerManuel(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'nombre_places' => 'required|integer|min:1'
        ]);

        if ($trajet->places_disponibles < $request->nombre_places) {
            return response()->json(['success' => false, 'message' => 'Pas assez de places disponibles.'], 400);
        }

        // On retire les places du véhicule
        $trajet->decrement('places_disponibles', $request->nombre_places);

        return response()->json([
            'success' => true,
            'message' => $request->nombre_places . ' place(s) retirée(s) manuellement.',
            'places_restantes' => $trajet->places_disponibles
        ], 200);
    }

    /**
     * Récupère la liste exacte des passagers acceptés pour un trajet (La feuille de route)
     */
    public function listePassagers(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        // Sécurité : Seul le chauffeur du trajet (ou un Admin) peut voir les numéros de téléphone !
        if ($trajet->conducteur_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        // On va chercher dans la table Réservation, uniquement les statuts ACCEPTEE
        $reservations = $trajet->reservations()
                               ->with('passager:id,nom,prenom,telephone,photo_profil') // On charge les infos utiles du passager
                               ->where('statut', 'ACCEPTEE')
                               ->get();

        return response()->json([
            'success' => true,
            'message' => 'Feuille de route du trajet',
            'data' => $reservations
        ], 200);
    }
    public function libererPlaceManuelle(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);

        // Sécurité : seul le chauffeur peut faire ça
        if ($trajet->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'nombre_places' => 'required|integer|min:1'
        ]);

        // Sécurité logic : On ne peut pas avoir plus de places libres que le max de la voiture
        if ($trajet->places_disponibles + $request->nombre_places > $trajet->nombre_places_totales) {
            return response()->json(['success' => false, 'message' => 'Le véhicule est déjà complètement vide !'], 400);
        }

        // On RAJOUTE une place disponible
        $trajet->increment('places_disponibles', $request->nombre_places);

        return response()->json([
            'success' => true,
            'message' => 'Place libérée avec succès.',
            'places_restantes' => $trajet->places_disponibles
        ], 200);
    }
    /**
     * PASSAGER : Réserver une place sur un trajet
     */
    public function reserverTrajet(Request $request, $id)
    {
        $trajet = Trajet::findOrFail($id);
        $user = $request->user();

        // 1. Sécurité : Le chauffeur ne peut pas réserver son propre trajet
        if ($trajet->conducteur_id === $user->id) {
            return response()->json(['success' => false, 'message' => 'Vous ne pouvez pas réserver votre propre trajet.'], 400);
        }

        // 2. Sécurité : Vérifier s'il reste de la place
        if ($trajet->places_disponibles < 1) {
            return response()->json(['success' => false, 'message' => 'Désolé, ce trajet est complet.'], 400);
        }

        // 3. Sécurité (Optionnelle) : Vérifier si le passager n'a pas déjà réservé ce trajet
        $dejaReserve = \App\Models\Reservation::where('trajet_id', $trajet->id)
                                              ->where('passager_id', $user->id)
                                              ->first();
        if ($dejaReserve) {
            return response()->json(['success' => false, 'message' => 'Vous avez déjà réservé une place pour ce trajet.'], 400);
        }

        // 4. On crée la réservation officielle
        \App\Models\Reservation::create([
            'trajet_id' => $trajet->id,
            'passager_id' => $user->id,
            'statut' => 'ACCEPTEE' // Ou 'EN_ATTENTE' si tu veux que le chauffeur valide manuellement plus tard
        ]);

        // 5. On retire 1 place disponible au véhicule
        $trajet->decrement('places_disponibles', 1);

        return response()->json([
            'success' => true,
            'message' => 'Réservation confirmée avec succès ! Bon voyage.'
        ], 200);
    }
    /**
     * HISTORIQUE : Les réservations du passager connecté
     */
    public function mesReservations(Request $request)
    {
        // On cherche les réservations du passager, et on charge les infos du trajet, du chauffeur et du véhicule liés
        $reservations = \App\Models\Reservation::with(['trajet.conducteur', 'trajet.vehicule'])
                            ->where('passager_id', $request->user()->id)
                            ->orderBy('created_at', 'desc')
                            ->get();

        return response()->json(['success' => true, 'data' => $reservations], 200);
    }
}