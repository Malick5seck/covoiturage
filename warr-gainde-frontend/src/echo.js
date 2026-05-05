import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

/**
 * Instance Echo configurée pour Reverb avec authentification Bearer token.
 *
 * IMPORTANT : l'auth des canaux privés (private-notifications.{id})
 * passe par /api/broadcasting/auth qui accepte le Bearer token Sanctum.
 * On injecte dynamiquement le token au moment de la requête d'auth
 * pour gérer les cas de reconnexion après login/logout.
 */
const echo = new Echo({
    broadcaster:   'reverb',
    key:           import.meta.env.VITE_REVERB_APP_KEY,
    wsHost:        import.meta.env.VITE_REVERB_HOST  ?? 'localhost',
    wsPort:        Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    wssPort:       Number(import.meta.env.VITE_REVERB_PORT) || 443,
    forceTLS:      (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats:  true,

    // -------------------------------------------------------------------------
    // Endpoint d'authentification des canaux privés
    // Pointe vers notre route API (pas /broadcasting/auth web qui nécessite session)
    // -------------------------------------------------------------------------
    authEndpoint: `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/broadcasting/auth`,

    auth: {
        headers: {
            // Le token est lu dynamiquement à chaque tentative d'auth
            // pour être toujours à jour après login/logout
            get Authorization() {
                const token = localStorage.getItem('token');
                return token ? `Bearer ${token}` : '';
            },
            Accept: 'application/json',
        },
    },
});

export default echo;