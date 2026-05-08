<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('phone_password_resets');
    }

    public function down(): void
    {
        // Pas de rollback : la table d'origine était créée dans une autre migration
    }
};