<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Canaux de Broadcast — Warr Gaïndé
|--------------------------------------------------------------------------
|
| Chaque canal privé est sécurisé : seul l'utilisateur propriétaire
| peut s'y abonner. L'authentification se fait via le token Sanctum
| (Bearer) injecté dans les headers de la requête d'auth WebSocket.
|
*/

// ---------------------------------------------------------------------------
// Canal privé notifications : private-notifications.{userId}
// Utilisé par NotificationEnvoyee pour les alertes temps réel.
// ---------------------------------------------------------------------------
Broadcast::channel('notifications.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// ---------------------------------------------------------------------------
// Canal privé GPS trajet : private-trajet.{trajetId}
// Réservé aux passagers ayant une réservation ACCEPTÉE sur ce trajet,
// et au conducteur lui-même.
// ---------------------------------------------------------------------------
Broadcast::channel('trajet.{trajetId}', function ($user, $trajetId) {
    // Le conducteur peut toujours écouter son propre trajet
    $trajet = \App\Models\Trajet::find($trajetId);
    if (!$trajet) return false;

    if ((int) $trajet->conducteur_id === (int) $user->id) {
        return true;
    }

    // Un passager avec une réservation acceptée peut aussi écouter
    return \App\Models\Reservation::where('trajet_id', $trajetId)
        ->where('passager_id', $user->id)
        ->where('statut', 'ACCEPTEE')
        ->exists();
});

// ---------------------------------------------------------------------------
// Canal privé utilisateur générique (Sanctum SPA)
// ---------------------------------------------------------------------------
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});