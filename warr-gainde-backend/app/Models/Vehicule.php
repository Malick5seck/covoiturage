<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicule extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'conducteur_id', 'marque_modele', 'immatriculation', 
        'nombre_places_max', 'climatisation', 'couleur', 
        'annee_fabrication', 'photo_vehicule'
    ];

    protected $casts = [
        'climatisation' => 'boolean',
    ];

    public function proprietaire()
    {
        return $this->belongsTo(User::class, 'conducteur_id');
    }

    public function trajets()
    {
        return $this->hasMany(Trajet::class);
    }
}
