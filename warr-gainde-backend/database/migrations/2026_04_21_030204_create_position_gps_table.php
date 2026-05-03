<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BUG CORRIGÉ : L'ancienne version n'avait pas de colonne `created_at`.
     * Le tri par `created_at` dans dernierePosition() retournait un ordre
     * imprévisible. On utilise maintenant `date_position` comme timestamp
     * d'insertion précis ET comme colonne de tri fiable.
     *
     * NETTOYAGE : Un index sur (trajet_id, date_position) est ajouté pour
     * que la requête "dernière position d'un trajet" reste rapide même avec
     * des millions de lignes.
     */
    public function up(): void
    {
        Schema::create('position_gps', function (Blueprint $table) {
            $table->id();

            $table->foreignId('trajet_id')
                  ->constrained('trajets')
                  ->onDelete('cascade'); // Suppression automatique si le trajet est supprimé

            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);

            // Précision GPS optionnelle (en mètres) — utile pour filtrer les fixes mauvais
            $table->float('precision_metres')->nullable();

            // Timestamp de la position côté serveur (remplace l'ancien useCurrent sans index)
            $table->timestamp('date_position')->useCurrent();

            // Statut du trajet au moment de la position (utile pour l'audit)
            $table->enum('statut_trajet', ['EN_COURS', 'ARCHIVE'])->default('EN_COURS');

            // ---------------------------------------------------------------
            // INDEX COMPOSÉ : trajet_id + date_position
            // Rend ultra-rapide les requêtes :
            //   WHERE trajet_id = X ORDER BY date_position DESC LIMIT 1
            //   WHERE trajet_id = X AND statut_trajet = 'EN_COURS'
            // ---------------------------------------------------------------
            $table->index(['trajet_id', 'date_position'], 'idx_trajet_position');
            $table->index(['statut_trajet', 'date_position'],  'idx_statut_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('position_gps');
    }
};