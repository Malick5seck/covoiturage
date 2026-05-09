<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();

            // Qui a effectué l'action
            $table->foreignId('admin_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // Type d'action métier
            $table->enum('action', [
                'BAN_USER',
                'CHANGE_DRIVER_STATUS',
                'UPDATE_COMMISSION',
                'CREATE_MODERATEUR',
                'VIEW_STATS',
                'VIEW_USERS',
            ]);

            // Entité cible (optionnelle)
            $table->string('target_type')->nullable();   // Ex : "User", "Setting"
            $table->unsignedBigInteger('target_id')->nullable(); // Ex : l'id de l'utilisateur banni

            // Snapshot JSON de ce qui a changé
            $table->json('details')->nullable();

            // Contexte réseau
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();

            // Index pour les requêtes fréquentes
            $table->index(['admin_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
    }
};