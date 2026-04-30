<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notification extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'type', 'message', 'date_notification', 'date_lecture'
    ];

    protected $casts = [
        'date_notification' => 'datetime',
        'date_lecture' => 'datetime', 
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}