<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ForgotPasswordController;
use App\Http\Controllers\Api\PhonePasswordResetController;
use App\Http\Controllers\Api\ResetPasswordController;
use App\Http\Controllers\Api\VehiculeController;
use App\Http\Controllers\Api\TrajetController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\EvaluationController;
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

Route::middleware('throttle:6,1')->group(function () {
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
    Route::post('/reset-password', [ResetPasswordController::class, 'reset']);
    Route::post('/forgot-password-phone', [PhonePasswordResetController::class, 'forgotPhone']);
    Route::post('/verify-otp', [PhonePasswordResetController::class, 'verifyOtp']);
    Route::post('/reset-password-phone', [PhonePasswordResetController::class, 'resetPassword']);
});
Route::get('/trajets', [TrajetController::class, 'index']);
Route::get('/chauffeurs/{conducteurId}/evaluations', [EvaluationController::class, 'indexChauffeur']);
Route::post('/recharges/webhook', [RechargeController::class, 'webhook']);

/*
|--------------------------------------------------------------------------
| 🔴 ROUTES PROTÉGÉES (Sanctum Bearer Token)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    // =========================================================================
    // AUTH BROADCASTING — canal privé Reverb via Bearer token
    //
    // Laravel cherche par défaut /broadcasting/auth sur le guard "web" (session).
    // Ici on expose la même logique via l'API guard Sanctum pour que
    // le frontend puisse s'authentifier avec son Bearer token.
    // =========================================================================
    Route::post('/broadcasting/auth', function (Request $request) {
        return Broadcast::auth($request);
    });

    // -------------------------------------------------------------------------
    // PROFIL & UTILISATEUR
    // -------------------------------------------------------------------------
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profil', [AuthController::class, 'updateProfile']);
    Route::post('/profil/photo', [UploadController::class, 'uploadPhotoProfil']);
    Route::post('/profil/mot-de-passe', [AuthController::class, 'changerMotDePasse']);

    // -------------------------------------------------------------------------
    // VÉHICULES
    // -------------------------------------------------------------------------
    Route::apiResource('vehicules', VehiculeController::class);
    Route::post('/vehicules/{id}/photo', [UploadController::class, 'uploadPhotoVehicule']);
    Route::post('/user/photo', [UploadController::class, 'uploadPhotoProfil']);

    // -------------------------------------------------------------------------
    // TRAJETS (CHAUFFEUR)
    // -------------------------------------------------------------------------
    Route::post('/trajets', [TrajetController::class, 'store']);
    Route::get('/mes-trajets', [TrajetController::class, 'mesTrajets']);
    Route::get('/trajets/{id}/passagers', [TrajetController::class, 'listePassagers']);

    Route::post('/trajets/{id}/demarrer', [TrajetController::class, 'demarrerTrajet']);
    Route::post('/trajets/{id}/terminer', [TrajetController::class, 'terminerTrajet']);
    Route::post('/trajets/{id}/annuler', [TrajetController::class, 'annulerTrajet']);
    Route::post('/trajets/{id}/passager-manuel', [TrajetController::class, 'ajouterPassagerManuel']);
    Route::post('/trajets/{id}/place-liberee', [TrajetController::class, 'libererPlaceManuelle']);
    Route::get('/trajets/{trajetId}/gps/historique', [PositionGpsController::class, 'historiquePositions']);

    // Route GPS unique (suppression du doublon présent dans l'ancienne version)
    Route::get('/trajets/{trajetId}/gps/derniere', [PositionGpsController::class, 'dernierePosition']);
    Route::post('/trajets/{trajetId}/gps', [PositionGpsController::class, 'enregistrerPosition']);

    // -------------------------------------------------------------------------
    // RÉSERVATIONS (PASSAGER)
    // -------------------------------------------------------------------------
    Route::post('/trajets/{id}/reserver', [ReservationController::class, 'store']);
    Route::get('/mes-reservations', [ReservationController::class, 'mesReservations']);

    Route::post('/reservations/{id}/accepter', [ReservationController::class, 'accepterReservation']);
    Route::post('/reservations/{id}/refuser', [ReservationController::class, 'refuserReservation']);
    Route::post('/reservations/{id}/annuler', [ReservationController::class, 'annulerReservation']);
    Route::get('/reservations/demandes-recues', [ReservationController::class, 'demandesRecues']);

    // -------------------------------------------------------------------------
    // ÉVALUATIONS
    // -------------------------------------------------------------------------
    Route::post('/chauffeurs/{id}/evaluations', [EvaluationController::class, 'store']);
    Route::get('/mes-evaluations', [EvaluationController::class, 'mesEvaluations']);

    // -------------------------------------------------------------------------
    // PORTEFEUILLE
    // -------------------------------------------------------------------------
    Route::post('/portefeuille/initier', [RechargeController::class, 'initierRecharge']);
    Route::post('/portefeuille/verifier/{token}', [RechargeController::class, 'verifierStatut']);
    Route::get('/portefeuille/historique', [RechargeController::class, 'historique']);

    // -------------------------------------------------------------------------
    // NOTIFICATIONS
    // -------------------------------------------------------------------------
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/lire', [NotificationController::class, 'marquerCommeLue']);
    Route::post('/notifications/lire-tout', [NotificationController::class, 'marquerToutesCommeLues']);

    // -------------------------------------------------------------------------
    // ZONE ADMIN
    // -------------------------------------------------------------------------
    Route::prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::post('/chauffeurs/{id}/statut', [AdminController::class, 'changerStatutChauffeur']);
        Route::delete('/users/{id}', [AdminController::class, 'bannirUtilisateur']);
        Route::post('/commission', [AdminController::class, 'configurerTauxCommission']);
        Route::post('/moderateurs', [AdminController::class, 'ajouterModerateur']);
    });
});