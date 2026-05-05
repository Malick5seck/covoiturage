import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import echo from '../echo';
import { getUser } from '../utils/auth';

/**
 * Hook central pour la gestion des notifications en temps réel.
 *
 * Responsabilités :
 * - Charger les notifications initiales depuis l'API
 * - S'abonner au canal privé Reverb de l'utilisateur
 * - Mettre à jour le state à chaque nouvelle notification reçue
 * - Exposer les actions (marquer lue, marquer tout, etc.)
 *
 * Utilisation :
 *   const { notifications, nonLuesCount, marquerLue, marquerTout } = useNotificationsTempsReel();
 */
export function useNotificationsTempsReel() {
    const user = getUser();

    const [notifications, setNotifications]   = useState([]);
    const [nonLuesCount, setNonLuesCount]     = useState(0);
    const [loading, setLoading]               = useState(true);
    const [nouvelleNotif, setNouvelleNotif]   = useState(null); // dernière notif reçue (pour toast)

    const channelRef = useRef(null);
    const isSubscribed = useRef(false);

    // =========================================================================
    // CHARGEMENT INITIAL
    // =========================================================================

    const chargerNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data || []);
            setNonLuesCount(res.data.non_lues_count ?? 0);
        } catch (err) {
            console.error('[Notifications] Erreur chargement:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // =========================================================================
    // ABONNEMENT WEBSOCKET
    // =========================================================================

    useEffect(() => {
        if (!user?.id || isSubscribed.current) return;

        // Charger les notifs existantes
        chargerNotifications();

        // S'abonner au canal privé
        const channelName = `notifications.${user.id}`;
        channelRef.current = echo.private(channelName);

        channelRef.current
            .listen('.notification.recue', (data) => {
                const nouvelleNotification = {
                    id:                 data.id,
                    type:               data.type,
                    message:            data.message,
                    date_notification:  data.date_notification,
                    date_lecture:       null,
                    created_at:         data.created_at,
                };

                // Ajouter en tête de liste
                setNotifications(prev => [nouvelleNotification, ...prev]);
                setNonLuesCount(prev => prev + 1);
                setNouvelleNotif(nouvelleNotification);

                // Réinitialiser le toast après 5s
                setTimeout(() => setNouvelleNotif(null), 5000);
            })
            .error((err) => {
                console.warn('[Reverb] Erreur canal notifications:', err);
            });

        isSubscribed.current = true;

        return () => {
            if (channelRef.current) {
                echo.leave(channelName);
                channelRef.current = null;
                isSubscribed.current = false;
            }
        };
    }, [user?.id]);

    // =========================================================================
    // ACTIONS
    // =========================================================================

    const marquerLue = useCallback(async (id) => {
        try {
            await api.post(`/notifications/${id}/lire`);
            setNotifications(prev =>
                prev.map(n => n.id === id
                    ? { ...n, date_lecture: new Date().toISOString() }
                    : n
                )
            );
            setNonLuesCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('[Notifications] Erreur marquer lue:', err);
        }
    }, []);

    const marquerTout = useCallback(async () => {
        try {
            await api.post('/notifications/lire-tout');
            const now = new Date().toISOString();
            setNotifications(prev => prev.map(n => ({ ...n, date_lecture: n.date_lecture ?? now })));
            setNonLuesCount(0);
        } catch (err) {
            console.error('[Notifications] Erreur marquer tout:', err);
        }
    }, []);

    return {
        notifications,
        nonLuesCount,
        loading,
        nouvelleNotif,     // dernière notif non lue reçue en temps réel → pour le toast
        marquerLue,
        marquerTout,
        recharger: chargerNotifications,
    };
}

/**
 * Retourne l'emoji et la couleur associés à un type de notification.
 */
export function getNotifMeta(type) {
    const map = {
        RESERVATION_RECUE:    { emoji: '🔔', color: 'blue',   label: 'Nouvelle demande'     },
        RESERVATION_ACCEPTEE: { emoji: '✅', color: 'green',  label: 'Réservation acceptée' },
        RESERVATION_REFUSEE:  { emoji: '❌', color: 'red',    label: 'Réservation refusée'  },
        RESERVATION_ANNULEE:  { emoji: '↩️', color: 'orange', label: 'Réservation annulée'  },
        DEPART_IMMINENT:      { emoji: '🚗', color: 'blue',   label: 'Départ imminent'       },
        ARRIVEE:              { emoji: '🏁', color: 'green',  label: 'Arrivée'               },
        ANNULATION:           { emoji: '⚠️', color: 'orange', label: 'Trajet annulé'         },
        RECHARGE_EFFECTUEE:   { emoji: '💰', color: 'green',  label: 'Recharge confirmée'    },
        PAIEMENT_VALIDE:      { emoji: '💳', color: 'green',  label: 'Paiement validé'       },
        TRAJET_PLEIN:         { emoji: '🚫', color: 'red',    label: 'Trajet complet'        },
    };
    return map[type] ?? { emoji: '📬', color: 'gray', label: 'Notification' };
}