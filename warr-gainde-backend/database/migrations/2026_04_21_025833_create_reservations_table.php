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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id(); 
            
            $table->foreignId('passager_id')->constrained('users')->onDelete('cascade');
           
            $table->foreignId('trajet_id')->constrained('trajets')->onDelete('cascade');

            $table->integer('nombre_places');
            $table->enum('type_reservation', ['CLASSIQUE', 'EN_ROUTE'])->default('CLASSIQUE');
            
            $table->decimal('prix_unitaire_fige', 10, 2);

            $table->string('point_embarquement_nom')->nullable();
            $table->decimal('point_embarquement_lat', 10, 7)->nullable();
            $table->decimal('point_embarquement_long', 10, 7)->nullable();

            $table->boolean('est_pour_un_tiers')->default(false);
            $table->string('nom_passager_tiers')->nullable();
            $table->string('tel_passager_tiers')->nullable();
            
            $table->boolean('est_privatisee')->default(false);

            $table->enum('statut', ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE'])->default('EN_ATTENTE');
            $table->string('motif_annulation')->nullable();
            
            $table->dateTime('date_reservation')->useCurrent();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
