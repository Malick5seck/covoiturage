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
        Schema::create('recharges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conducteur_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('trajet_id')->nullable()->constrained('trajets')->onDelete('cascade');
            
            $table->decimal('montant', 10, 2);
            $table->enum('type_transaction', ['RECHARGE', 'PRELEVEMENT', 'REMBOURSEMENT']);
            $table->enum('statut', ['EN_ATTENTE', 'REUSSI', 'ECHOUE'])->default('EN_ATTENTE');
            $table->string('transaction_id')->nullable(); 
            
            $table->dateTime('date_recharge')->useCurrent();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recharges');
    }
};
