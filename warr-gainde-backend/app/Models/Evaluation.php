<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Evaluation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'trajet_id', 'passager_id', 'conducteur_id', 
        'note', 'commentaire', 'date_evaluation'
    ];

    protected $casts = [
        'date_evaluation' => 'datetime',
    ];


    public function trajet()
    {
        return $this->belongsTo(Trajet::class);
    }

    public function passager()
    {
        return $this->belongsTo(User::class, 'passager_id');
    }

    public function conducteur()
    {
        return $this->belongsTo(User::class, 'conducteur_id');
    }
}
