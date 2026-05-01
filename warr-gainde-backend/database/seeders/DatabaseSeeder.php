<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Point d'entrée unique pour tous les seeders.
     * Ordre important : les utilisateurs doivent exister avant les véhicules,
     * les véhicules avant les trajets, etc.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            // VehiculeSeeder::class,  // À créer quand nécessaire
            // TrajetSeeder::class,    // À créer quand nécessaire
        ]);
    }
}