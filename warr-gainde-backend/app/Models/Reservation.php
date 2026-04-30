<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reservation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'passager_id', 'trajet_id', 'nombre_places', 'type_reservation',
        'prix_unitaire_fige', 'point_embarquement_nom', 'point_embarquement_lat',
        'point_embarquement_long', 'est_pour_un_tiers', 'nom_passager_tiers',
        'tel_passager_tiers', 'est_privatisee', 'statut', 'motif_annulation'
    ];

    public function passager()
    {
        return $this->belongsTo(User::class, 'passager_id');
    }

    public function trajet()
    {
        return $this->belongsTo(Trajet::class);
    }
}