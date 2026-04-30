<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Importation des Contrôleurs
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VehiculeController;
use App\Http\Controllers\Api\TrajetController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\EvaluationController; // On garde celui-là ou ReviewController
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\RechargeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\PositionGpsController;
use App\Http\Controllers\Api\AdminController;

/*
|--------------------------------------------------------------------------
| 🟢 ROUTES PUBLIQUES
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/trajets', [TrajetController::class, 'index']); 
Route::get('/chauffeurs/{conducteurId}/evaluations', [EvaluationController::class, 'indexChauffeur']); 

/*
|--------------------------------------------------------------------------
| 🔴 ROUTES PROTÉGÉES (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    // --- PROFIL & UTILISATEUR ---
    Route::get('/user', function (Request $request) { return $request->user(); });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profil', [AuthController::class, 'updateProfile']);
    Route::post('/profil/photo', [UploadController::class, 'uploadPhotoProfil']);
    Route::post('/profil/mot-de-passe', [AuthController::class, 'changerMotDePasse']);

    // --- VÉHICULES ---
    // Utilise l'API Resource pour index, store, show, update, destroy
    Route::apiResource('vehicules', VehiculeController::class);
    Route::post('/vehicules/{id}/photo', [UploadController::class, 'uploadPhotoVehicule']);
    Route::post('/user/photo', [UploadController::class, 'uploadPhotoProfil']); // Pour la photo de profil

    // --- TRAJETS (CHAUFFEUR) ---
    Route::post('/trajets', [TrajetController::class, 'store']);
    Route::get('/mes-trajets', [TrajetController::class, 'mesTrajets']); // Pour le Dashboard
    Route::get('/trajets/{id}/passagers', [TrajetController::class, 'listePassagers']); // Feuille de route
    
    // Cycle de vie
    Route::post('/trajets/{id}/demarrer', [TrajetController::class, 'demarrerTrajet']);
    Route::post('/trajets/{id}/terminer', [TrajetController::class, 'terminerTrajet']);
    Route::post('/trajets/{id}/annuler', [TrajetController::class, 'annulerTrajet']);
    Route::post('/trajets/{id}/passager-manuel', [TrajetController::class, 'ajouterPassagerManuel']);
    Route::post('/trajets/{id}/place-liberee', [TrajetController::class, 'libererPlaceManuelle']);

    // --- RÉSERVATIONS (PASSAGER) ---
    Route::post('/trajets/{id}/reserver', [ReservationController::class, 'store']);
    Route::get('/mes-reservations', [ReservationController::class, 'mesReservations']); // Pour le Dashboard
    
    // Actions sur résas
    Route::post('/reservations/{id}/accepter', [ReservationController::class, 'accepterReservation']);
    Route::post('/reservations/{id}/refuser', [ReservationController::class, 'refuserReservation']);
    Route::post('/reservations/{id}/annuler', [ReservationController::class, 'annulerReservation']);

    // --- ÉVALUATIONS ---
    // On synchronise avec le bouton du Dashboard React
    Route::post('/trajets/{id}/reviews', [ReviewController::class, 'store']);

    // --- PORTEFEUILLE ---
    Route::post('/portefeuille/recharger', [RechargeController::class, 'rechargerCompte']);
    Route::get('/portefeuille/historique', [RechargeController::class, 'historique']);

    // --- GPS ---
    Route::post('/trajets/{trajetId}/gps', [PositionGpsController::class, 'enregistrerPosition']);
    Route::get('/trajets/{trajetId}/gps/derniere', [PositionGpsController::class, 'dernierePosition']);

    // --- NOTIFICATIONS ---
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/lire', [NotificationController::class, 'marquerCommeLue']);
    Route::post('/notifications/lire-tout', [NotificationController::class, 'marquerToutesCommeLues']);

    // --- 🛡️ ZONE ADMIN ---
    Route::prefix('admin')->group(function () {
        // Stats pour les cartes du Dashboard Admin
        Route::get('/stats', [AdminController::class, 'getDashboardStats']); 
        // Liste des users pour le tableau
        Route::get('/users', [AdminController::class, 'getUsers']); 
        // Modération
        Route::post('/chauffeurs/{id}/statut', [AdminController::class, 'changerStatutChauffeur']);
        Route::delete('/utilisateurs/{id}', [AdminController::class, 'bannirUtilisateur']);
        // Configuration JSON
        Route::post('/commission', [AdminController::class, 'configurerTauxCommission']);
        // Gestion de l'équipe
        Route::post('/moderateurs', [AdminController::class, 'ajouterModerateur']);
    });
});