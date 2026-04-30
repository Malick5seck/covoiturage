import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    depart: '',
    arrivee: '',
    date: ''
  });

  const handleSearch = (e) => {
    e.preventDefault();
    // On redirige vers la page de recherche avec les paramètres dans l'URL
    navigate(`/recherche?depart=${searchData.depart}&arrivee=${searchData.arrivee}&date=${searchData.date}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HERO SECTION */}
      <div className="bg-gainde-dark text-white py-20 px-4 relative overflow-hidden">
        {/* Décoration de fond optionnelle */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            Vos trajets interurbains au Sénégal,<br />
            <span className="text-gainde-yellow">simples et sécurisés.</span>
          </h1>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto font-medium">
            De Dakar à Thiès, de Saint-Louis à Ziguinchor. Trouvez votre place ou partagez vos frais de route en toute sérénité avec Warr Gaïndé.
          </p>

          {/* BARRE DE RECHERCHE PRINCIPALE */}
          <div className="bg-white p-4 rounded-3xl shadow-2xl max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
              
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">📍</div>
                <input 
                  type="text" required placeholder="Départ (ex: Dakar)"
                  className="w-full pl-10 pr-4 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 text-gray-800 font-bold outline-none"
                  value={searchData.depart}
                  onChange={(e) => setSearchData({...searchData, depart: e.target.value})}
                />
              </div>

              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">🎯</div>
                <input 
                  type="text" required placeholder="Arrivée (ex: Thiès)"
                  className="w-full pl-10 pr-4 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 text-gray-800 font-bold outline-none"
                  value={searchData.arrivee}
                  onChange={(e) => setSearchData({...searchData, arrivee: e.target.value})}
                />
              </div>

              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">📅</div>
                <input 
                  type="date" 
                  className="w-full pl-10 pr-4 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 text-gray-800 font-bold outline-none"
                  value={searchData.date}
                  onChange={(e) => setSearchData({...searchData, date: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="bg-gainde-yellow text-gainde-dark px-8 py-4 rounded-2xl font-black text-lg hover:bg-yellow-500 transition shadow-lg"
              >
                Rechercher
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION RÉASSURANCE / AVANTAGES */}
      <div className="max-w-7xl mx-auto py-20 px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-gainde-dark">Pourquoi choisir Warr Gaïndé ?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center hover:-translate-y-2 transition duration-300">
            <div className="text-5xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-gainde-dark mb-3">Chauffeurs vérifiés</h3>
            <p className="text-gray-500">Tous nos conducteurs sont enregistrés et évalués par la communauté pour garantir votre sécurité.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center hover:-translate-y-2 transition duration-300">
            <div className="text-5xl mb-4">💸</div>
            <h3 className="text-xl font-bold text-gainde-dark mb-3">Économique</h3>
            <p className="text-gray-500">Partagez les frais de route. Des prix transparents, sans mauvaises surprises à l'arrivée.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center hover:-translate-y-2 transition duration-300">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-gainde-dark mb-3">100% Mobile</h3>
            <p className="text-gray-500">Gérez vos réservations, contactez votre chauffeur via WhatsApp et payez facilement depuis votre téléphone.</p>
          </div>
        </div>
      </div>

      {/* SECTION CALL TO ACTION (Pour attirer les chauffeurs) */}
      <div className="max-w-5xl mx-auto px-4 mb-20">
        <div className="bg-gainde-dark rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between shadow-2xl">
          <div className="text-white mb-8 md:mb-0 md:mr-8">
            <h2 className="text-3xl font-black mb-4">Vous avez une voiture ?</h2>
            <p className="text-gray-300 text-lg">
              Rentabilisez vos trajets en prenant des passagers. L'inscription est gratuite et vous gardez le contrôle de votre véhicule.
            </p>
          </div>
          <Link to="/publier" className="bg-white text-gainde-dark px-8 py-4 rounded-2xl font-black text-lg hover:bg-gray-100 transition whitespace-nowrap">
            Proposer un trajet
          </Link>
        </div>
      </div>

    </div>
  );
}

export default Home;