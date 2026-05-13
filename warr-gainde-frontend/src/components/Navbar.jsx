import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout as authLogout } from '../utils/auth';
import { useNotificationsTempsReel } from '../hooks/UseNotificationsTempsReel';
import NotificationToast from '../components/NotificationToast';
import api from '../api/axios';

function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = getUser();
  const { nouvelleNotif } = useNotificationsTempsReel();

  const isChauffeur = user?.role_actuel === 'CHAUFFEUR';
  const isPassager  = user?.role_actuel === 'PASSAGER';
  const isAdmin     = user?.role_actuel === 'ADMIN';

  /* Badge notifications non lues */
  const [badge, setBadge] = useState(0);
  const prevNouvelleNotif = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get('/notifications')
      .then(res => { if (!cancelled) setBadge(res.data.non_lues_count || 0); })
      .catch(err => { if (!cancelled) console.error('Failed fetching notifications:', err); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (nouvelleNotif && prevNouvelleNotif.current !== nouvelleNotif) {
      setBadge(prev => prev + 1);
    }
    prevNouvelleNotif.current = nouvelleNotif;
  }, [nouvelleNotif]);

  /* Fermer le menu à chaque navigation */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => { authLogout(); navigate('/login'); };

  const isActive = (path) =>
    location.pathname === path
      ? 'text-gainde-dark bg-gray-100'
      : 'text-gray-500 hover:text-gainde-dark hover:bg-gray-50';

  /* Avatar / initiale partagé */
  const Avatar = ({ size = 'sm' }) => {
    const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
    return (
      <div className={`${dim} rounded-full bg-gainde-yellow text-gainde-dark flex items-center justify-center font-black overflow-hidden shrink-0`}>
        {user?.photo_profil
          ? <img src={user.photo_profil} alt="profil" className="w-full h-full object-cover" />
          : (user?.prenom?.charAt(0)?.toUpperCase() || '?')
        }
      </div>
    );
  };

  return (
    <>
      <NotificationToast notification={nouvelleNotif} onClose={() => {}} />

      {/* overflow-x-hidden empêche tout débordement horizontal */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          {/* ── BARRE PRINCIPALE ───────────────────────────────────────── */}
          {/* h-14 sur mobile (56 px), h-20 sur desktop */}
          <div className="flex items-center justify-between h-14 md:h-20 gap-2 min-w-0">

            {/* LOGO — ne rétrécit jamais */}
            <Link
              to="/"
              className="font-black flex items-center tracking-tight hover:opacity-80 transition shrink-0 text-lg md:text-2xl"
            >
              <span className="text-black">Warr</span>
              <span className="text-gainde-yellow">Gaïndé</span>
            </Link>

            {/* NAVIGATION CENTRALE — desktop uniquement */}
            {user && (
              <div className="hidden md:flex items-center gap-1 min-w-0 flex-1 justify-center">
                {isPassager && (
                  <>
                    <Link to="/recherche" className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/recherche')}`}>
                      🔍 Rechercher
                    </Link>
                    <Link to="/mes-reservations" className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/mes-reservations')}`}>
                      🎫 Mes réservations
                    </Link>
                  </>
                )}
                {isChauffeur && (
                  <>
                    <Link to="/mes-trajets"     className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/mes-trajets')}`}>🛣️ Mes trajets</Link>
                    <Link to="/demandes-recues" className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/demandes-recues')}`}>📋 Demandes</Link>
                    <Link to="/publier"         className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/publier')}`}>➕ Publier</Link>
                    <Link to="/mon-vehicule"    className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/mon-vehicule')}`}>🚗 Véhicule</Link>
                    <Link to="/portefeuille"    className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/portefeuille')}`}>💰 Portefeuille</Link>
                    <Link to="/mes-evaluations" className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap ${isActive('/mes-evaluations')}`}>⭐ Avis</Link>
                  </>
                )}
                {isAdmin && (
                  <Link to="/admin" className={`px-4 py-2 rounded-xl font-bold text-sm transition whitespace-nowrap text-purple-600 hover:bg-purple-50 ${location.pathname === '/admin' ? 'bg-purple-100' : ''}`}>
                    🛡️ Administration
                  </Link>
                )}
              </div>
            )}

            {/* ── PARTIE DROITE — shrink-0 pour ne jamais être écrasée ── */}
            <div className="flex items-center gap-1.5 shrink-0">

              {/* MOBILE connecté : cloche + avatar */}
              {user && (
                <div className="flex md:hidden items-center gap-1">
                  {/* Cloche */}
                  <Link
                    to="/notifications"
                    className="relative p-2 rounded-xl hover:bg-gray-100 active:bg-gray-100 transition"
                    aria-label={`Notifications${badge > 0 ? ` (${badge})` : ''}`}
                  >
                    <svg className="w-[22px] h-[22px] text-gray-600" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-black flex items-center justify-center rounded-full shadow"
                        style={{ minWidth: '1.1rem', height: '1.1rem', fontSize: '9px', padding: '0 2px' }}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>

                  {/* Avatar → profil */}
                  <Link to="/profil" aria-label="Mon profil" className="shrink-0">
                    <Avatar size="sm" />
                  </Link>
                </div>
              )}

              {/* MOBILE visiteur : Connexion + S'inscrire */}
              {!user && (
                <div className="flex md:hidden items-center gap-1">
                  <Link to="/login"
                    className="text-gainde-dark font-bold text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition whitespace-nowrap">
                    Connexion
                  </Link>
                  <Link to="/register"
                    className="bg-gainde-dark text-white text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition whitespace-nowrap">
                    S'inscrire
                  </Link>
                </div>
              )}

              {/* DESKTOP : notifications + profil + déconnexion */}
              <div className="hidden md:flex items-center gap-3">
                {user ? (
                  <>
                    <Link to="/notifications" title="Notifications"
                      className="relative p-2.5 rounded-xl hover:bg-gray-100 transition">
                      🔔
                      {badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                    <Link to="/profil"
                      className="flex items-center gap-2.5 bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-gainde-dark hover:bg-gray-100 transition border border-gray-100">
                      <Avatar size="sm" />
                      <span className="text-sm whitespace-nowrap">Mon espace</span>
                    </Link>
                    <button onClick={handleLogout}
                      className="text-red-500 font-bold hover:bg-red-50 px-4 py-2.5 rounded-xl transition text-sm whitespace-nowrap">
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-gainde-dark font-bold hover:text-gray-600 transition px-4 py-2 text-sm whitespace-nowrap">
                      Connexion
                    </Link>
                    <Link to="/register"
                      className="bg-gainde-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-md text-sm whitespace-nowrap">
                      S'inscrire
                    </Link>
                  </>
                )}
              </div>

              {/* HAMBURGER */}
              <button
                className="md:hidden p-2 bg-gray-50 hover:bg-gray-100 active:bg-gray-100 rounded-xl transition shrink-0"
                onClick={() => setMenuOpen(v => !v)}
                aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? (
                  <svg className="w-5 h-5 text-gainde-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gainde-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ── MENU MOBILE déroulant ──────────────────────────────────── */}
          {menuOpen && (
            <div className="md:hidden border-t border-gray-100 pt-3 pb-4 space-y-0.5">
              {user ? (
                <>
                  {/* Carte utilisateur */}
                  <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-50 rounded-xl">
                    <Avatar size="md" />
                    <div className="min-w-0">
                      <p className="font-black text-gainde-dark text-sm truncate">
                        {user.prenom} {user.nom}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.role_actuel?.charAt(0) + user.role_actuel?.slice(1)?.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {isPassager && (
                    <>
                      <NavMobileLink to="/recherche">🔍 Rechercher un trajet</NavMobileLink>
                      <NavMobileLink to="/mes-reservations">🎫 Mes réservations</NavMobileLink>
                    </>
                  )}
                  {isChauffeur && (
                    <>
                      <NavMobileLink to="/mes-trajets">🛣️ Mes trajets</NavMobileLink>
                      <NavMobileLink to="/demandes-recues">📋 Demandes reçues</NavMobileLink>
                      <NavMobileLink to="/publier">➕ Publier un trajet</NavMobileLink>
                      <NavMobileLink to="/mon-vehicule">🚗 Mon véhicule</NavMobileLink>
                      <NavMobileLink to="/portefeuille">💰 Mon portefeuille</NavMobileLink>
                      <NavMobileLink to="/mes-evaluations">⭐ Avis reçus</NavMobileLink>
                    </>
                  )}
                  {isAdmin && (
                    <NavMobileLink to="/admin" extraClass="text-purple-600">🛡️ Administration</NavMobileLink>
                  )}
                  <NavMobileLink to="/profil">👤 Mon profil</NavMobileLink>

                  <div className="pt-2 mt-1 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition text-sm"
                    >
                      🚪 Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <NavMobileLink to="/login">Connexion</NavMobileLink>
                  <NavMobileLink to="/register">S'inscrire</NavMobileLink>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

/* ── Lien mobile avec état actif ─────────────────────────────────────────── */
function NavMobileLink({ to, children, extraClass = '' }) {
  const location = useLocation();
  const active   = to === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 rounded-xl font-bold text-sm transition
        ${active ? 'bg-gray-100 text-gainde-dark' : 'text-gray-600 hover:bg-gray-50'}
        ${extraClass}`}
    >
      {children}
    </Link>
  );
}

export default Navbar;