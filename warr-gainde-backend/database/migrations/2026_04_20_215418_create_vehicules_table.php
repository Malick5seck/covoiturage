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
        Schema::create('vehicules', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('conducteur_id')->constrained('users')->onDelete('cascade');
            
            $table->string('marque_modele');
            $table->string('immatriculation')->unique();
            $table->integer('nombre_places_max');
            $table->boolean('climatisation')->default(false);
            $table->string('couleur')->nullable();
            $table->integer('annee_fabrication')->nullable();
            $table->string('photo_vehicule')->nullable();
            
            $table->timestamps();
            $table->softDeletes(); 
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('vehicules');
    }
};
