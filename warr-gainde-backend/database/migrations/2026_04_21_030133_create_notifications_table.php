<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            $table->enum('type', [
                'RESERVATION_RECUE', 'RESERVATION_ACCEPTEE', 'RESERVATION_REFUSEE','RESERVATION_ANNULEE', 
                'TRAJET_PLEIN', 'DEPART_IMMINENT', 'ARRIVEE', 'ANNULATION', 
                'PAIEMENT_VALIDE', 'RECHARGE_EFFECTUEE'
            ]);
            
            $table->text('message');
            $table->dateTime('date_notification')->useCurrent();
            $table->dateTime('date_lecture')->nullable(); 
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
