<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PositionGps extends Model
{
    public $timestamps = false; 

    protected $table = 'position_gps'; 

    protected $fillable = [
        'trajet_id', 'latitude', 'longitude', 'date_position'
    ];

    protected $casts = [
        'date_position' => 'datetime',
    ];


    public function trajet()
    {
        return $this->belongsTo(Trajet::class);
    }
}