<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trajets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conducteur_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('vehicule_id')->constrained('vehicules')->onDelete('cascade');

            $table->string('ville_depart');
            $table->string('ville_arrivee');
            $table->decimal('latitude_depart', 10, 7)->nullable();
            $table->decimal('longitude_depart', 10, 7)->nullable();
            $table->decimal('latitude_arrivee', 10, 7)->nullable();
            $table->decimal('longitude_arrivee', 10, 7)->nullable();
            $table->decimal('latitude_actuelle', 10, 7)->nullable();
            $table->decimal('longitude_actuelle', 10, 7)->nullable();

            $table->decimal('distance_km', 8, 2)->nullable();
            $table->dateTime('date_heure_depart');
            $table->dateTime('heure_depart_reelle')->nullable();
            $table->dateTime('heure_arrivee_reelle')->nullable();

            $table->decimal('prix_par_place', 10, 2);
            $table->integer('nombre_places_totales');
            $table->integer('places_disponibles');

            $table->enum('statut', ['EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE'])
                  ->default('EN_ATTENTE');

            $table->decimal('taux_commission_applique', 4, 2);

            // Compteur de passagers cumulés pour la commission progressive
            $table->unsignedInteger('total_passagers_cumules')->default(0);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trajets');
    }
};