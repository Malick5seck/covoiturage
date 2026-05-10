<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE admin_audit_logs MODIFY COLUMN action 
            ENUM('BAN_USER','CHANGE_DRIVER_STATUS','UPDATE_COMMISSION',
                 'CREATE_MODERATEUR','VIEW_STATS','VIEW_USERS','SUSPEND_USER')");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE admin_audit_logs MODIFY COLUMN action 
            ENUM('BAN_USER','CHANGE_DRIVER_STATUS','UPDATE_COMMISSION',
                 'CREATE_MODERATEUR','VIEW_STATS','VIEW_USERS')");
    }
};