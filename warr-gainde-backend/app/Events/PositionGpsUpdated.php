<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PositionGpsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int   $trajet_id,
        public float $latitude,
        public float $longitude,
        public string $updated_at
    ) {}

    public function broadcastOn(): array
    {
        // Canal public dédié à ce trajet
        return [
            new PrivateChannel("trajet.{$this->trajet_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'position.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'trajet_id'  => $this->trajet_id,
            'lat'        => $this->latitude,
            'lng'        => $this->longitude,
            'updated_at' => $this->updated_at,
        ];
    }
}