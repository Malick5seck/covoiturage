<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trajets', function (Blueprint $table) {
            $table->string('point_embarquement_nom')->nullable()->after('ville_arrivee');
            $table->decimal('point_embarquement_lat', 10, 7)->nullable()->after('point_embarquement_nom');
            $table->decimal('point_embarquement_long', 10, 7)->nullable()->after('point_embarquement_lat');
        });
    }

    public function down(): void
    {
        Schema::table('trajets', function (Blueprint $table) {
            $table->dropColumn(['point_embarquement_nom', 'point_embarquement_lat', 'point_embarquement_long']);
        });
    }
};