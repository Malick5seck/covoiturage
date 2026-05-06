import React, { useEffect, useState } from 'react';
import { getNotifMeta } from '../hooks/UseNotificationsTempsReel';

/**
 * Toast de notification temps réel.
 * S'affiche en bas à droite avec une animation slide-in.
 * Disparaît automatiquement après 5 secondes.
 *
 * Props :
 *   notification — objet notif (id, type, message) ou null
 *   onClose      — callback pour fermer manuellement
 */
function NotificationToast({ notification, onClose }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (!notification) return;

        setExiting(false);
        setVisible(true);

        const exitTimer = setTimeout(() => {
            setExiting(true);
        }, 4500);

        const hideTimer = setTimeout(() => {
            setVisible(false);
            onClose?.();
        }, 5000);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(hideTimer);
        };
    }, [notification?.id]);

    if (!visible || !notification) return null;

    const meta = getNotifMeta(notification.type);

    const colorMap = {
        blue:   { bg: 'bg-blue-50',   border: 'border-blue-400',  text: 'text-blue-700',  badge: 'bg-blue-400'   },
        green:  { bg: 'bg-green-50',  border: 'border-green-400', text: 'text-green-700', badge: 'bg-green-400'  },
        red:    { bg: 'bg-red-50',    border: 'border-red-400',   text: 'text-red-700',   badge: 'bg-red-400'    },
        orange: { bg: 'bg-orange-50', border: 'border-orange-400',text: 'text-orange-700',badge: 'bg-orange-400' },
        gray:   { bg: 'bg-gray-50',   border: 'border-gray-300',  text: 'text-gray-700',  badge: 'bg-gray-400'   },
    };
    const c = colorMap[meta.color] ?? colorMap.gray;

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={`
                fixed bottom-6 right-6 z-[9999] w-80 max-w-[calc(100vw-3rem)]
                ${c.bg} border-l-4 ${c.border}
                rounded-2xl shadow-2xl p-4
                flex items-start gap-3
                transition-all duration-500
                ${exiting
                    ? 'opacity-0 translate-x-8 pointer-events-none'
                    : 'opacity-100 translate-x-0'
                }
            `}
            style={{ animation: exiting ? undefined : 'slideInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
            {/* Indicateur live */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                <span className="text-2xl leading-none">{meta.emoji}</span>
                <span className={`flex h-2 w-2 relative`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.badge} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${c.badge}`}></span>
                </span>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-black uppercase tracking-wide ${c.text} mb-1`}>
                    {meta.label}
                </p>
                <p className="text-sm text-gray-700 leading-snug line-clamp-3">
                    {notification.message}
                </p>
            </div>

            {/* Bouton fermer */}
            <button
                onClick={() => { setExiting(true); setTimeout(() => { setVisible(false); onClose?.(); }, 400); }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition ml-1 mt-0.5"
                aria-label="Fermer"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>

            {/* Barre de progression */}
            <div
                className={`absolute bottom-0 left-0 h-0.5 ${c.badge} rounded-full opacity-60`}
                style={{ animation: 'progressBar 5s linear forwards' }}
            />

            <style>{`
                @keyframes slideInToast {
                    from { opacity: 0; transform: translateX(2rem) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes progressBar {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>
        </div>
    );
}

export default NotificationToast;
