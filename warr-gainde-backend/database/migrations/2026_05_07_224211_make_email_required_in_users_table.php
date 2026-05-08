<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. S'assurer qu'aucun email NULL ou vide ne traîne (sécurité)
        DB::table('users')->whereNull('email')->orWhere('email', '')->update([
            'email' => DB::raw("CONCAT('temp_', id, '@placeholder.local')"),
        ]);

        // 2. Modifier la colonne pour la rendre NOT NULL
        DB::statement("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL UNIQUE");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL UNIQUE");
    }
};