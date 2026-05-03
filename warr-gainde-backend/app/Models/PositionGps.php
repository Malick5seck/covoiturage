<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class PositionGps extends Model
{
    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /**
     * On désactive les timestamps Eloquent automatiques (created_at / updated_at)
     * car notre table n'utilise que `date_position` comme timestamp d'insertion.
     * Cela évite que Laravel cherche des colonnes inexistantes.
     */
    public $timestamps = false;

    protected $table = 'position_gps';

    protected $fillable = [
        'trajet_id',
        'latitude',
        'longitude',
        'precision_metres',
        'date_position',
        'statut_trajet',
    ];

    protected $casts = [
        'latitude'         => 'float',
        'longitude'        => 'float',
        'precision_metres' => 'float',
        'date_position'    => 'datetime',
    ];

    // =========================================================================
    // RELATION
    // =========================================================================

    public function trajet()
    {
        return $this->belongsTo(Trajet::class);
    }

    // =========================================================================
    // SCOPES — Requêtes réutilisables
    // =========================================================================

    /**
     * Positions encore actives (trajet en cours).
     */
    public function scopeEnCours(Builder $query): Builder
    {
        return $query->where('statut_trajet', 'EN_COURS');
    }

    /**
     * Positions archivées (trajet terminé, en attente de nettoyage).
     */
    public function scopeArchivees(Builder $query): Builder
    {
        return $query->where('statut_trajet', 'ARCHIVE');
    }

    /**
     * Positions plus anciennes qu'un nombre de jours donné.
     * Utilisé par la commande de nettoyage.
     *
     * @param int $jours Nombre de jours de rétention
     */
    public function scopePlusVieillesque(Builder $query, int $jours): Builder
    {
        return $query->where('date_position', '<', now()->subDays($jours));
    }

    /**
     * Positions pour un trajet spécifique, triées du plus récent au plus ancien.
     * CORRECTION BUG : on trie par `date_position` (qui existe) et non
     * par `created_at` (qui n'existait pas dans l'ancienne migration).
     */
    public function scopePourTrajet(Builder $query, int $trajetId): Builder
    {
        return $query
            ->where('trajet_id', $trajetId)
            ->orderBy('date_position', 'desc');
    }

    // =========================================================================
    // MÉTHODES STATIQUES UTILITAIRES
    // =========================================================================

    /**
     * Récupère la dernière position connue d'un trajet.
     * Retourne null si aucune position n'existe.
     */
    public static function dernierePositionDu(int $trajetId): ?self
    {
        return static::pourTrajet($trajetId)->first();
    }

    /**
     * Marque toutes les positions d'un trajet comme archivées.
     * Appelé à la fin du trajet avant le nettoyage différé.
     *
     * @return int Nombre de lignes mises à jour
     */
    public static function archiverPourTrajet(int $trajetId): int
    {
        return static::where('trajet_id', $trajetId)
                     ->where('statut_trajet', 'EN_COURS')
                     ->update(['statut_trajet' => 'ARCHIVE']);
    }

    /**
     * Compte le nombre de positions enregistrées pour un trajet.
     * Utile pour les stats du tableau de bord admin.
     */
    public static function nombrePositionsPourTrajet(int $trajetId): int
    {
        return static::where('trajet_id', $trajetId)->count();
    }
}