<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable
{
    use HasApiTokens,HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'nom', 'prenom', 'telephone', 'email', 'password', 'role_actuel',
        'numero_permis', 'date_delivrance_permis', 'solde_portefeuille', 
        'photo_profil', 'statut_verification', 'niveau_accreditation'
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'date_delivrance_permis' => 'date',
    ];

    public function isConducteur() { return $this->role_actuel === 'CHAUFFEUR'; }
    public function isPassager() { return $this->role_actuel === 'PASSAGER'; }
    public function isAdmin() { return $this->role_actuel === 'ADMIN'; }


    public function vehicules()
    {
        return $this->hasMany(Vehicule::class, 'conducteur_id');
    }

    public function trajetsPublies()
    {
        return $this->hasMany(Trajet::class, 'conducteur_id');
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'passager_id');
    }

    public function recharges()
    {
        return $this->hasMany(Recharge::class, 'conducteur_id');
    }
}
