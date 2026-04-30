<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Trajet extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'conducteur_id', 'vehicule_id', 'ville_depart', 'ville_arrivee',
        'latitude_depart', 'longitude_depart', 'latitude_arrivee', 'longitude_arrivee',
        'latitude_actuelle', 'longitude_actuelle', 'distance_km',
        'date_heure_depart', 'heure_depart_reelle', 'heure_arrivee_reelle',
        'prix_par_place', 'nombre_places_totales', 'places_disponibles',
        'statut', 'taux_commission_applique'
    ];

    protected $casts = [
        'date_heure_depart' => 'datetime',
        'heure_depart_reelle' => 'datetime',
        'heure_arrivee_reelle' => 'datetime',
    ];

    public function conducteur()
    {
        return $this->belongsTo(User::class, 'conducteur_id');
    }

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function positionsGps()
    {
        return $this->hasMany(PositionGps::class);
    }
}