import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUser } from '../utils/auth';
import api from '../api/axios';

/* ─── Onglets par rôle ─────────────────────────────────────────────────
   CHAUFFEUR : 5 onglets (Publier centré en 3ᵉ position)
   PASSAGER  : 5 onglets
   ADMIN     : 4 onglets
   GUEST     : 4 onglets
──────────────────────────────────────────────────────────────────────── */
const tabsByRole = {
  PASSAGER: [
    { to: '/',                 label: 'Accueil',      icon: HomeIcon        },
    { to: '/recherche',        label: 'Rechercher',   icon: SearchIcon      },
    { to: '/mes-reservations', label: 'Réservations', icon: TicketIcon      },
    { to: '/notifications',    label: 'Alertes',      icon: BellIcon,  badge: true },
    { to: '/profil',           label: 'Profil',       icon: UserIcon        },
  ],
  CHAUFFEUR: [
    { to: '/',                 label: 'Accueil',      icon: HomeIcon        },
    { to: '/mes-trajets',      label: 'Trajets',      icon: RouteIcon       },
    { to: '/publier',          label: 'Publier',      icon: PlusIcon,  highlight: true },
    { to: '/demandes-recues',  label: 'Demandes',     icon: InboxIcon       },
    { to: '/profil',           label: 'Profil',       icon: UserIcon        },
  ],
  ADMIN: [
    { to: '/',                 label: 'Accueil',      icon: HomeIcon        },
    { to: '/admin',            label: 'Admin',        icon: ShieldIcon      },
    { to: '/notifications',    label: 'Alertes',      icon: BellIcon,  badge: true },
    { to: '/profil',           label: 'Profil',       icon: UserIcon        },
  ],
  GUEST: [
    { to: '/recherche',        label: 'Rechercher',   icon: SearchIcon      },
    { to: '/',                 label: 'Trajets',      icon: RouteIcon       },
  ],
};

/* ─── Composant principal ─────────────────────────────────────────────── */

function BottomNav() {
  const location = useLocation();
  const user     = getUser();
  const role     = user?.role_actuel ?? 'GUEST';
  const tabs     = tabsByRole[role] ?? tabsByRole.GUEST;

  const [badge, setBadge]           = useState(0);
  const [isStandalone, setStandalone] = useState(false);

  /* Détecter mode PWA standalone */
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setStandalone(mq.matches || window.navigator.standalone === true);
    const handler = (e) => setStandalone(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Badge notifications — rechargé à chaque navigation */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get('/notifications')
      .then(res => { if (!cancelled) setBadge(res.data.non_lues_count ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, location.pathname]);

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Espaceur pour que le contenu ne soit pas caché derrière la nav */}
      <div
        className="md:hidden"
        style={{ height: isStandalone ? 'calc(4.5rem + env(safe-area-inset-bottom))' : '4.5rem' }}
        aria-hidden="true"
      />

      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50"
        style={{
          paddingBottom: isStandalone ? 'env(safe-area-inset-bottom)' : '0',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
        }}
        aria-label="Navigation principale"
      >
        <div
          className="flex items-stretch"
          style={{ height: '4.25rem' }}
        >
          {tabs.map((tab) => {
            const active    = isActive(tab.to);
            const Icon      = tab.icon;
            const showBadge = tab.badge && badge > 0;

            /* ── Bouton "Publier" mis en valeur ─────────────────────── */
            if (tab.highlight) {
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="flex flex-col items-center justify-center flex-1 relative"
                  style={{ minWidth: 0 }}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className="flex items-center justify-center rounded-2xl transition-all duration-200"
                    style={{
                      width: '3rem',
                      height: '3rem',
                      background: active
                        ? '#111827'
                        : 'linear-gradient(135deg,#F5A623 0%,#f0940a 100%)',
                      boxShadow: active
                        ? '0 4px 14px rgba(17,24,39,0.35)'
                        : '0 4px 14px rgba(245,166,35,0.45)',
                      transform: active ? 'scale(0.95)' : 'scale(1)',
                    }}
                  >
                    <Icon style={{ color: '#fff', width: 22, height: 22 }} />
                  </span>
                  <span
                    className="text-[10px] font-black mt-0.5 tracking-tight"
                    style={{ color: active ? '#111827' : '#F5A623' }}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }

            /* ── Onglet standard ────────────────────────────────────── */
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center flex-1 relative"
                style={{ minWidth: 0 }}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {/* Trait actif en haut */}
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ width: '1.75rem', height: '3px', background: '#F5A623' }}
                    aria-hidden="true"
                  />
                )}

                {/* Icône + badge */}
                <span className="relative">
                  <Icon
                    className="transition-all duration-200"
                    style={{
                      width: 22,
                      height: 22,
                      color: active ? '#111827' : '#9CA3AF',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                  {showBadge && (
                    <span
                      className="absolute -top-1 -right-1.5 flex items-center justify-center rounded-full text-white font-black"
                      style={{
                        minWidth: badge > 9 ? '1.2rem' : '1rem',
                        height: '1rem',
                        fontSize: '9px',
                        background: '#EF4444',
                        lineHeight: 1,
                        padding: '0 2px',
                      }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className="transition-all duration-200 mt-0.5 tracking-tight truncate w-full text-center px-0.5"
                  style={{
                    fontSize: '10px',
                    fontWeight: active ? 800 : 500,
                    color: active ? '#111827' : '#9CA3AF',
                    lineHeight: 1.2,
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/* ─── Icônes SVG inline ─────────────────────────────────────────────────── */

function HomeIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}
function SearchIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function TicketIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
      <path d="M13 5v2m0 4v2m0 4v2"/>
    </svg>
  );
}
function BellIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function UserIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function RouteIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="6" cy="19" r="3"/>
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
      <circle cx="18" cy="5" r="3"/>
    </svg>
  );
}
function PlusIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}
function InboxIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}
function WalletIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  );
}
function ShieldIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function LoginIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  );
}
function RegisterIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  );
}

export default BottomNav;