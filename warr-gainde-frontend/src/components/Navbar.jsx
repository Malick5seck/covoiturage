import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, getToken, logout as authLogout } from '../utils/auth';
import { useNotificationsTempsReel } from '../hooks/UseNotificationsTempsReel';
import NotificationToast from './NotificationToast';

function Navbar() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = getToken();
  const user  = getUser();
  const { nouvelleNotif } = useNotificationsTempsReel();

  const isChauffeur = user?.role_actuel === 'CHAUFFEUR';
  const isPassager  = user?.role_actuel === 'PASSAGER';
  const isAdmin     = user?.role_actuel === 'ADMIN';

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path
      ? 'text-gainde-dark bg-gray-100'
      : 'text-gray-500 hover:text-gainde-dark hover:bg-gray-50';

  return (
    <>
    <NotificationToast notification={nouvelleNotif} onClose={() => {}} />
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* LOGO */}
          <Link to="/" className="text-2xl font-black flex items-center tracking-tight hover:opacity-80 transition shrink-0">
            <span className="text-black">Warr</span>
            <span className="text-gainde-yellow">Gaïndé</span>
          </Link>

          {/* NAVIGATION CENTRALE — connecté */}
          {user && (
            <div className="hidden md:flex items-center gap-1">

              {/* ── PASSAGER ────────────────────────────────────────── */}
              {isPassager && (
                <>
                  <Link to="/recherche" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/recherche')}`}>
                    🔍 Rechercher
                  </Link>
                  <Link to="/mes-reservations" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/mes-reservations')}`}>
                    🎫 Mes réservations
                  </Link>
                </>
              )}

              {/* ── CHAUFFEUR ────────────────────────────────────────── */}
              {isChauffeur && (
                <>
                  <Link to="/mes-trajets" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/mes-trajets')}`}>
                    🛣️ Mes trajets
                  </Link>
                  <Link to="/demandes-recues" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/demandes-recues')}`}>
                    📋 Demandes
                  </Link>
                  <Link to="/publier" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/publier')}`}>
                    ➕ Publier
                  </Link>
                  <Link to="/mon-vehicule" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/mon-vehicule')}`}>
                    🚗 Véhicule
                  </Link>
                  <Link to="/portefeuille" className={`px-4 py-2 rounded-xl font-bold text-sm transition ${isActive('/portefeuille')}`}>
                    💰 Portefeuille
                  </Link>
                </>
              )}

              {/* ── ADMIN ────────────────────────────────────────────── */}
              {isAdmin && (
                <Link to="/admin" className={`px-4 py-2 rounded-xl font-bold text-sm transition text-purple-600 hover:bg-purple-50 ${location.pathname === '/admin' ? 'bg-purple-100' : ''}`}>
                  🛡️ Administration
                </Link>
              )}
            </div>
          )}

          {/* PARTIE DROITE */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications */}
                <Link to="/notifications" title="Notifications"
                  className={`p-2.5 rounded-xl transition ${isActive('/notifications')}`}>
                  🔔
                </Link>

                {/* MON ESPACE → PROFIL */}
                <Link to="/profil"
                  className="flex items-center gap-2.5 bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-gainde-dark hover:bg-gray-100 transition border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gainde-yellow text-gainde-dark flex items-center justify-center text-sm font-black overflow-hidden shrink-0">
                    {user.photo_profil ? (
                      <img src={user.photo_profil} alt="profil" className="w-full h-full object-cover" />
                    ) : (
                      user.prenom?.charAt(0) || '?'
                    )}
                  </div>
                  <span className="text-sm">Mon espace</span>
                </Link>

                <button onClick={handleLogout}
                  className="text-red-500 font-bold hover:bg-red-50 px-4 py-2.5 rounded-xl transition text-sm">
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gainde-dark font-bold hover:text-gray-600 transition px-4 py-2 text-sm">
                  Connexion
                </Link>
                <Link to="/register"
                  className="bg-gainde-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-md text-sm">
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* HAMBURGER MOBILE */}
          <button className="md:hidden text-gainde-dark p-2 bg-gray-50 rounded-xl"
            onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/>
              </svg>
            )}
          </button>
        </div>

        {/* MENU MOBILE */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            {user ? (
              <>
                {/* Passager */}
                {isPassager && (
                  <>
                    <NavMobileLink to="/recherche"        onClick={() => setMenuOpen(false)}>🔍 Rechercher un trajet</NavMobileLink>
                    <NavMobileLink to="/mes-reservations" onClick={() => setMenuOpen(false)}>🎫 Mes réservations</NavMobileLink>
                  </>
                )}

                {/* Chauffeur */}
                {isChauffeur && (
                  <>
                    <NavMobileLink to="/mes-trajets"      onClick={() => setMenuOpen(false)}>🛣️ Mes trajets</NavMobileLink>
                    <NavMobileLink to="/demandes-recues"  onClick={() => setMenuOpen(false)}>📋 Demandes reçues</NavMobileLink>
                    <NavMobileLink to="/publier"          onClick={() => setMenuOpen(false)}>➕ Publier un trajet</NavMobileLink>
                    <NavMobileLink to="/mon-vehicule"     onClick={() => setMenuOpen(false)}>🚗 Mon véhicule</NavMobileLink>
                    <NavMobileLink to="/portefeuille"     onClick={() => setMenuOpen(false)}>💰 Mon portefeuille</NavMobileLink>
                  </>
                )}

                {/* Admin */}
                {isAdmin && (
                  <NavMobileLink to="/admin" onClick={() => setMenuOpen(false)} extraClass="text-purple-600">
                    🛡️ Administration
                  </NavMobileLink>
                )}

                <NavMobileLink to="/notifications" onClick={() => setMenuOpen(false)}>🔔 Notifications</NavMobileLink>

                {/* Mon espace = Profil */}
                <NavMobileLink to="/profil" onClick={() => setMenuOpen(false)}>👤 Mon espace (Profil)</NavMobileLink>

                <div className="pt-2 border-t border-gray-100 mt-2">
                  <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="block w-full text-left px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition text-sm">
                    Déconnexion
                  </button>
                </div>
              </>
            ) : (
              <>
                <NavMobileLink to="/login"    onClick={() => setMenuOpen(false)}>Connexion</NavMobileLink>
                <NavMobileLink to="/register" onClick={() => setMenuOpen(false)}>S'inscrire</NavMobileLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
    </>
  );
}

// Composant lien mobile
function NavMobileLink({ to, onClick, children, extraClass = '' }) {
  return (
    <Link to={to} onClick={onClick}
      className={`block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition text-sm ${extraClass}`}>
      {children}
    </Link>
  );
}

export default Navbar;
