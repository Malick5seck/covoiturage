<?php

return [

    // 1. Quelles routes sont concernées par ces règles ? (Toute l'API)
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // 2. Quelles méthodes HTTP sont autorisées ? (GET, POST, PUT, DELETE...)
    'allowed_methods' => ['*'],

    // 3. 🚨 QUI a le droit de parler à ton API ?
    // Ajoute le port de ton futur React (3000 si tu utilises Create React App, 5173 si tu utilises Vite)
    'allowed_origins' => ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],

    // Optionnel : Si tu veux autoriser tout le monde en phase de test (à éviter en production)
    // 'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    // 4. Quels en-têtes (Headers) sont autorisés ? (ex: Authorization pour le Token Bearer)
    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // 5. Autoriser l'envoi de cookies/tokens de sécurité
    'supports_credentials' => true,

];