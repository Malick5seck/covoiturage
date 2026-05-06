<?php

namespace App\Console\Commands;

use App\Models\PositionGps;
use Illuminate\Console\Command;

class GpsNettoyer extends Command
{
    protected $signature = 'gps:nettoyer {--jours-archive=30}';
    protected $description = 'Supprime les positions GPS archivées plus anciennes qu\'un certain nombre de jours.';

    public function handle(): int
    {
        $jours = (int) $this->option('jours-archive');

        $supprimees = PositionGps::archivees()
                                ->plusVieillesque($jours)
                                ->delete();

        $this->info("{$supprimees} positions GPS archivées et supprimées (plus de {$jours} jours).");

        return Command::SUCCESS;
    }
}