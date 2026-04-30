<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['trajet_id', 'passenger_id', 'driver_id', 'rating', 'comment'];
}