<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. LE SUPER-ADMINISTRATEUR (Le grand patron)
        User::create([
            'nom' => 'Fondateur',
            'prenom' => 'Warr Gainde',
            'telephone' => '770000000',
            'email' => 'contact@warrgainde.sn',
            'password' => Hash::make('SuperSecret2026!'), // À changer en prod !
            'role_actuel' => 'ADMIN',
            'niveau_accreditation' => 'SUPER_ADMIN', // Le pouvoir absolu
            'statut_verification' => 'VALIDE',
        ]);

        // 2. UN MODÉRATEUR (Employé délégué)
        User::create([
            'nom' => 'Modérateur',
            'prenom' => 'Equipe',
            'telephone' => '770000001',
            'email' => 'mod@warrgainde.sn',
            'password' => Hash::make('ModSecret2026!'),
            'role_actuel' => 'ADMIN',
            'niveau_accreditation' => 'MODERATEUR', // Pouvoir limité
            'statut_verification' => 'VALIDE',
        ]);

        // 3. UN CHAUFFEUR DE TEST (Pour tes essais sur Postman)
        User::create([
            'nom' => 'Ndiaye',
            'prenom' => 'Moussa',
            'telephone' => '771111111',
            'password' => Hash::make('password123'),
            'role_actuel' => 'CHAUFFEUR',
            'statut_verification' => 'VALIDE', // Déjà validé pour faciliter les tests
            'numero_permis' => 'SN-DK-2020-1234',
        ]);

        // 4. UN PASSAGER DE TEST
        User::create([
            'nom' => 'Sow',
            'prenom' => 'Fatou',
            'telephone' => '772222222',
            'password' => Hash::make('password123'),
            'role_actuel' => 'PASSAGER',
        ]);
       
    }
}