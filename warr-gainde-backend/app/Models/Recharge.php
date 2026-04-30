<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Recharge extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'conducteur_id', 'trajet_id', 'montant', 'type_transaction', 
        'statut', 'transaction_id', 'date_recharge'
    ];

    protected $casts = [
        'date_recharge' => 'datetime',
    ];
    
    public function conducteur()
    {
        return $this->belongsTo(User::class, 'conducteur_id');
    }

    public function trajet()
    {
        return $this->belongsTo(Trajet::class);
    }
}
