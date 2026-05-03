<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| COMMANDES CONSOLE — Warr Gaïndé
|--------------------------------------------------------------------------
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| SCHEDULER — Nettoyage automatique des positions GPS
|--------------------------------------------------------------------------
|
| Le nettoyage est planifié en deux fréquences :
|
| 1. Toutes les nuits à 2h00 AM
|    → Nettoyage standard : purge les archives > 30 jours,
|      garde la dernière position de chaque trajet terminé.
|
| 2. Tous les dimanches à 3h00 AM (hebdomadaire)
|    → Nettoyage approfondi avec --jours-archive=7 pour les projets
|      à fort volume (beaucoup de trajets par jour).
|      À activer uniquement si la table position_gps dépasse 1 million de lignes.
|
| PRÉREQUIS : Ajouter dans le cron du serveur :
|   * * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
|
| Pour tester manuellement :
|   php artisan gps:nettoyer                    → Nettoyage standard
|   php artisan gps:nettoyer --dry-run          → Simulation (rien ne sera supprimé)
|   php artisan gps:nettoyer --jours-archive=7  → Purge rapide
|
*/

// Nettoyage nocturne standard (toutes les nuits)
Schedule::command('gps:nettoyer --jours-archive=30')
         ->dailyAt('02:00')
         ->withoutOverlapping()           // Pas deux instances en parallèle
         ->runInBackground()              // Ne bloque pas les autres tâches
         ->appendOutputTo(storage_path('logs/gps-nettoyage.log'));

// Optionnel — Nettoyage hebdomadaire agressif (à activer si fort volume)
// Schedule::command('gps:nettoyer --jours-archive=7')
//          ->weekly()
//          ->sundays()
//          ->at('03:00')
//          ->withoutOverlapping()
//          ->runInBackground()
//          ->appendOutputTo(storage_path('logs/gps-nettoyage.log'));