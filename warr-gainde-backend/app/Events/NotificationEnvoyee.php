<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Déclenché à chaque création de notification.
 * Diffusé immédiatement (ShouldBroadcastNow) sur le canal privé
 * de l'utilisateur destinataire.
 *
 * Canal : private-notifications.{user_id}
 * Événement client : .notification.recue
 */
class NotificationEnvoyee implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Notification $notification
    ) {}

    // =========================================================================
    // CANAL PRIVÉ : seul l'utilisateur ciblé peut recevoir ses notifs
    // =========================================================================

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("notifications.{$this->notification->user_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.recue';
    }

    // =========================================================================
    // PAYLOAD envoyé au frontend
    // =========================================================================

    public function broadcastWith(): array
    {
        return [
            'id'                => $this->notification->id,
            'type'              => $this->notification->type,
            'message'           => $this->notification->message,
            'date_notification' => $this->notification->date_notification?->toIso8601String(),
            'date_lecture'      => null,
            'created_at'        => $this->notification->created_at?->toIso8601String(),
        ];
    }
}