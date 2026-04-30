<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('reviews', function (Blueprint $table) {
        $table->id();
        $table->foreignId('trajet_id')->constrained()->onDelete('cascade');
        $table->foreignId('passenger_id')->constrained('users')->onDelete('cascade');
        $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
        
        $table->integer('rating'); // Note de 1 à 5
        $table->text('comment')->nullable(); // Commentaire optionnel
        
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
