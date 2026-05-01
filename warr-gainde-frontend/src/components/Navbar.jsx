// import React from 'react';
// import { Link, useNavigate } from 'react-router-dom';

// function Navbar() {
//   const navigate = useNavigate();
//   const user = JSON.parse(localStorage.getItem('user'));
//   const unreadCount = 0; // À lier à ton état global de notifications plus tard

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     navigate('/login');
//   };

//   if (!user) return null;

//   return (
//     <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
//       <div className="max-w-7xl mx-auto px-4">
//         <div className="flex justify-between h-20">
          
//           {/* LOGO */}
//           <div className="flex items-center">
//             <Link to="/" className="text-2xl font-black text-gainde-dark tracking-tighter">
//               WARR<span className="text-gainde-yellow">GAÏNDÉ</span>
//             </Link>
//           </div>

//           {/* LIENS DE NAVIGATION */}
//           <div className="hidden md:flex items-center space-x-6">
//             <Link to="/dashboard" className="font-bold text-gray-600 hover:text-gainde-dark transition">Tableau de bord</Link>
            
//             {/* Bouton de recherche accessible partout */}
//             <Link to="/" className="font-bold text-gainde-dark hover:text-gainde-yellow transition">
//                🔍 Rechercher un trajet
//             </Link>
            
//             {/* Liens spécifiques Chauffeur */}
//             {user.role_actuel === 'CHAUFFEUR' && (
//               <>
//                 <Link to="/publier" className="font-bold text-gray-600 hover:text-gainde-dark transition">Publier</Link>
//                 <Link to="/mon-vehicule" className="font-bold text-gray-600 hover:text-gainde-dark transition">Mon Véhicule</Link>
//                 <Link to="/portefeuille" className="font-bold text-gray-600 hover:text-gainde-dark transition">Portefeuille</Link>
//               </>
//             )}

//             {/* Lien Admin */}
//             {(user.role_actuel === 'ADMIN' || user.role_actuel === 'MODERATEUR') && (
//               <Link to="/admin" className="font-bold text-purple-600 hover:text-purple-800 transition">Administration</Link>
//             )}
//           </div>

//           {/* ACTIONS UTILISATEUR */}
//           <div className="flex items-center space-x-4">
            
//             <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-gainde-dark transition">
//               <span className="text-xl">🔔</span>
//               {unreadCount > 0 && (
//                 <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
//                   {unreadCount}
//                 </span>
//               )}
//             </Link>

//             <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
//               <Link to="/profil" className="flex items-center gap-2">
//                 <div className="w-10 h-10 rounded-full bg-gainde-yellow flex items-center justify-center font-black text-gainde-dark overflow-hidden border border-gray-100">
//                   {user.photo_profil ? (
//                     <img src={`http://localhost:8000/storage/${user.photo_profil}`} alt="Profil" className="w-full h-full object-cover" />
//                   ) : (
//                     user.prenom.charAt(0)
//                   )}
//                 </div>
//                 <div className="hidden lg:block">
//                   <p className="text-sm font-bold text-gainde-dark leading-none">{user.prenom}</p>
//                   <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{user.role_actuel}</p>
//                 </div>
//               </Link>
              
//               <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition" title="Déconnexion">
//                 🚪
//               </button>
//             </div>
//           </div>

//         </div>
//       </div>
//     </nav>
//   );
// }

// export default Navbar;
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  // On vérifie si un token est présent dans le localStorage
  const isAuthenticated = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    // On vide le localStorage lors de la déconnexion
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* LE TITRE / LOGO MODIFIÉ ICI */}
          <div className="flex items-center">
            <Link to="/" className="text-3xl font-black flex items-center tracking-tight hover:opacity-80 transition">
              <span className="text-black">Warr</span>
              <span className="text-gainde-yellow">Gaïndé</span>
            </Link>
          </div>

          {/* LES LIENS CENTRAUX (Masqués sur mobile) */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/recherche" className="text-gray-600 hover:text-gainde-dark font-bold transition flex items-center gap-2">
              <span>🔍</span> Rechercher
            </Link>
            <Link to="/publier" className="text-gray-600 hover:text-gainde-dark font-bold transition flex items-center gap-2">
              <span>➕</span> Publier un trajet
            </Link>
          </div>

          {/* LES BOUTONS D'AUTHENTIFICATION */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 text-gainde-dark font-bold hover:text-gray-600 transition bg-gray-50 px-4 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-gainde-yellow text-gainde-dark flex items-center justify-center text-sm font-black">
                    {user?.prenom?.charAt(0) || 'U'}
                  </div>
                  Mon Espace
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
                <Link to="/login" className="text-gainde-dark font-bold hover:text-gray-600 transition px-4 py-2">
                  Connexion
                </Link>
                <Link to="/register" className="bg-gainde-dark text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-md">
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* MENU MOBILE (Bouton Hamburger) */}
          <div className="md:hidden flex items-center">
            <button className="text-gainde-dark focus:outline-none p-2 bg-gray-50 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;