<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    // =========================================================================
    // CONFIGURATION ELOQUENT
    // =========================================================================

    protected $fillable = [
        'nom',
        'prenom',
        'telephone',
        'email',
        'email_verified_at',
        'password',
        'role_actuel',
        'numero_permis',
        'date_delivrance_permis',
        'solde_portefeuille',
        'photo_profil',
        'statut_verification',
        'note_moyenne',
        'niveau_accreditation',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at'   => 'datetime',
        'date_delivrance_permis' => 'date',
        'solde_portefeuille'  => 'decimal:2',
        'note_moyenne'        => 'decimal:2',
        'password'            => 'hashed',
    ];

    // =========================================================================
    // MÉTHODES MÉTIER — Vérification des rôles
    // Utilisées dans AdminController::checkAdmin() et partout dans l'app
    // =========================================================================

    /**
     * Vérifie si l'utilisateur est un Administrateur ou Modérateur.
     */
    public function isAdmin(): bool
    {
        return $this->role_actuel === 'ADMIN';
    }

    /**
     * Vérifie si l'utilisateur est un Conducteur (Chauffeur).
     */
    public function isConducteur(): bool
    {
        return $this->role_actuel === 'CHAUFFEUR';
    }

    /**
     * Vérifie si l'utilisateur est un Passager.
     */
    public function isPassager(): bool
    {
        return $this->role_actuel === 'PASSAGER';
    }

    /**
     * Vérifie si le chauffeur est validé par l'admin et peut publier des trajets.
     */
    public function estValide(): bool
    {
        if ($this->role_actuel !== 'CHAUFFEUR') {
            return true; // Les passagers et admins n'ont pas besoin de validation
        }
        return $this->statut_verification === 'VALIDE';
    }

    /**
     * Vérifie si c'est un Super Admin (le seul à pouvoir créer des modérateurs).
     */
    public function isSuperAdmin(): bool
    {
        return $this->role_actuel === 'ADMIN'
            && $this->niveau_accreditation === 'SUPER_ADMIN';
    }

    // =========================================================================
    // RELATIONS ELOQUENT — Architecture UML Warr Gaïndé
    // =========================================================================

    /**
     * Un conducteur possède plusieurs véhicules.
     * Relation : UTILISATEUR (CONDUCTEUR) → VEHICULE
     */
    public function vehicules()
    {
        return $this->hasMany(Vehicule::class, 'conducteur_id');
    }

    /**
     * Un conducteur publie plusieurs trajets.
     * Relation : UTILISATEUR (CONDUCTEUR) → TRAJET
     */
    public function trajets()
    {
        return $this->hasMany(Trajet::class, 'conducteur_id');
    }

    /**
     * Un passager effectue plusieurs réservations.
     * Relation : UTILISATEUR (PASSAGER) → RESERVATION
     */
    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'passager_id');
    }

    /**
     * Évaluations reçues par un conducteur (passagers → conducteur).
     * Sens unique selon l'UML : seul le passager évalue le conducteur.
     * Relation : EVALUATION.conducteur_id → UTILISATEUR
     */
    public function evaluationsRecues()
    {
        return $this->hasMany(Evaluation::class, 'conducteur_id');
    }

    /**
     * Évaluations données par un passager.
     * Relation : EVALUATION.passager_id → UTILISATEUR
     */
    public function evaluationsDonnees()
    {
        return $this->hasMany(Evaluation::class, 'passager_id');
    }

    /**
     * Mouvements du portefeuille du conducteur (recharges + prélèvements).
     * Relation : RECHARGE.conducteur_id → UTILISATEUR
     */
    public function recharges()
    {
        return $this->hasMany(Recharge::class, 'conducteur_id');
    }

    /**
     * Notifications reçues par l'utilisateur.
     * Relation : NOTIFICATION.user_id → UTILISATEUR
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    // =========================================================================
    // ACCESSEURS UTILES
    // =========================================================================

    /**
     * Nom complet formaté pour les notifications et l'affichage.
     */
    public function getNomCompletAttribute(): string
    {
        return $this->prenom . ' ' . $this->nom;
    }

    /**
     * Nombre de notifications non lues (utile pour le badge Navbar).
     */
    public function getNombreNotificationsNonLuesAttribute(): int
    {
        return $this->notifications()->whereNull('date_lecture')->count();
    }
}