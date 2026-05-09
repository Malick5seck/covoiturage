<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminAuditLog extends Model
{
    protected $fillable = [
        'admin_id',
        'action',
        'target_type',
        'target_id',
        'details',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    // =========================================================================
    // RELATIONS
    // =========================================================================

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    // =========================================================================
    // HELPER STATIQUE — appelé depuis AdminController
    // =========================================================================

    /**
     * Enregistre une action admin de façon non-bloquante.
     *
     * @param  \Illuminate\Http\Request  $request  Pour extraire IP et user-agent
     * @param  string  $action                     Constante d'action
     * @param  array   $details                    Données contextuelles libres
     * @param  string|null  $targetType            Nom de la classe cible
     * @param  int|null     $targetId              ID de l'entité cible
     */
    public static function log(
        \Illuminate\Http\Request $request,
        string $action,
        array $details = [],
        ?string $targetType = null,
        ?int $targetId = null
    ): void {
        try {
            self::create([
                'admin_id'    => $request->user()->id,
                'action'      => $action,
                'target_type' => $targetType,
                'target_id'   => $targetId,
                'details'     => empty($details) ? null : $details,
                'ip_address'  => $request->ip(),
                'user_agent'  => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {
            // L'audit ne doit jamais bloquer l'opération métier
            \Illuminate\Support\Facades\Log::warning(
                'AdminAuditLog::log() failed: ' . $e->getMessage()
            );
        }
    }
}