import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, getToken, logout as authLogout } from '../utils/auth';

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = getToken();
  const user  = getUser();

  const isChauffeur = user?.role_actuel === 'CHAUFFEUR';
  const isPassager  = user?.role_actuel === 'PASSAGER';
  const isAdmin     = user?.role_actuel === 'ADMIN';

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* LOGO */}
          <Link
            to="/"
            className="text-3xl font-black flex items-center tracking-tight hover:opacity-80 transition"
          >
            <span className="text-black">Warr</span>
            <span className="text-gainde-yellow">Gaïndé</span>
          </Link>

          {/* LIENS CENTRAUX — uniquement si connecté */}
          {user && (
            <div className="hidden md:flex items-center space-x-6">

              {/* Rechercher — uniquement passager */}
              {isPassager && (
                <Link
                  to="/recherche"
                  className="text-gray-600 hover:text-gainde-dark font-bold transition flex items-center gap-2"
                >
                  🔍 Rechercher un trajet
                </Link>
              )}

              {/* Liens chauffeur */}
              {isChauffeur && (
                <>
                  <Link
                    to="/publier"
                    className="text-gray-600 hover:text-gainde-dark font-bold transition flex items-center gap-2"
                  >
                    ➕ Publier un trajet
                  </Link>
                  <Link
                    to="/mon-vehicule"
                    className="text-gray-600 hover:text-gainde-dark font-bold transition flex items-center gap-2"
                  >
                    🚗 Mon véhicule
                  </Link>
                  <Link
                    to="/portefeuille"
                    className="text-gray-600 hover:text-gainde-dark font-bold transition flex items-center gap-2"
                  >
                    💰 Mon portefeuille
                  </Link>
                </>
              )}

              {/* Lien admin */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-purple-600 hover:text-purple-800 font-bold transition flex items-center gap-2"
                >
                  🛡️ Administration
                </Link>
              )}
            </div>
          )}

          {/* PARTIE DROITE */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-gray-400 hover:text-gainde-dark transition"
                  title="Notifications"
                >
                  🔔
                </Link>

                {/* Avatar + Mon espace */}
                <Link
                  to={isAdmin ? '/admin' : '/dashboard'}
                  className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl font-bold text-gainde-dark hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gainde-yellow text-gainde-dark flex items-center justify-center text-sm font-black overflow-hidden">
                    {user.photo_profil ? (
                      <img
                        src={user.photo_profil}
                        alt="profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.prenom?.charAt(0) || '?'
                    )}
                  </div>
                  {isAdmin ? 'Admin' : 'Mon espace'}
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gainde-dark font-bold hover:text-gray-600 transition px-4 py-2"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="bg-gainde-dark text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-md"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* HAMBURGER MOBILE */}
          <button
            className="md:hidden text-gainde-dark p-2 bg-gray-50 rounded-lg"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>

        </div>

        {/* MENU MOBILE DÉROULANT */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
            {user ? (
              <>
                {isPassager && (
                  <Link
                    to="/recherche"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                  >
                    🔍 Rechercher un trajet
                  </Link>
                )}

                {isChauffeur && (
                  <>
                    <Link
                      to="/publier"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                      ➕ Publier un trajet
                    </Link>
                    <Link
                      to="/mon-vehicule"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                      🚗 Mon véhicule
                    </Link>
                    <Link
                      to="/portefeuille"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                      💰 Mon portefeuille
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-purple-600 hover:bg-purple-50 transition"
                  >
                    🛡️ Administration
                  </Link>
                )}

                <Link
                  to="/notifications"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  🔔 Notifications
                </Link>

                <Link
                  to={isAdmin ? '/admin' : '/dashboard'}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  👤 Mon espace
                </Link>

                <div className="pt-2 border-t border-gray-100 mt-2">
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="block w-full text-left px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl font-bold text-gainde-dark hover:bg-gray-50 transition"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        )}

      </div>
    </nav>
  );
}

export default Navbar;