import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';

function Recherche() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Paramètres lus depuis l'URL
  const depart = searchParams.get('depart') || '';
  const arrivee = searchParams.get('arrivee') || '';
  const date = searchParams.get('date') || '';

  // États locaux pour le formulaire de recherche en haut de page
  const [localDepart, setLocalDepart] = useState(depart);
  const [localArrivee, setLocalArrivee] = useState(arrivee);
  const [localDate, setLocalDate] = useState(date);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. RECHERCHE DYNAMIQUE (Se lance au chargement et quand l'URL change)
  useEffect(() => {
    const fetchTrajets = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/trajets', {
          params: { ville_depart: depart, ville_arrivee: arrivee, date: date }
        });
        setTrajets(response.data.data || response.data); 
      } catch (err) {
        setError("Impossible de charger les trajets pour le moment.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrajets();
  }, [depart, arrivee, date]);

  // 2. SOUMISSION DU NOUVEAU FORMULAIRE
  const handleNouvelleRecherche = (e) => {
    e.preventDefault();
    setSearchParams({ depart: localDepart, arrivee: localArrivee, date: localDate });
  };

  const handleAjoutManuel = async (trajetId, placesDispo) => {
    if (placesDispo <= 0) return alert("Le véhicule est déjà plein !");
    try {
      const response = await api.post(`/trajets/${trajetId}/passager-manuel`, { nombre_places: 1 });
      if (response.data.success) {
        setTrajets(trajets.map(t => t.id === trajetId ? { ...t, places_disponibles: t.places_disponibles - 1 } : t));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'ajout manuel.");
    }
  };

  const handleLiberePlace = async (trajetId, placesDispo, placesMax) => {
    if (placesDispo >= placesMax) return alert("Toutes les places sont déjà libres !");
    try {
      const response = await api.post(`/trajets/${trajetId}/place-liberee`, { nombre_places: 1 });
      if (response.data.success) {
        setTrajets(trajets.map(t => t.id === trajetId ? { ...t, places_disponibles: t.places_disponibles + 1 } : t));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la libération de la place.");
    }
  };

  const handleReservation = async (trajetId) => {
    if (!user) {
      alert("Vous devez être connecté pour réserver un trajet.");
      return;
    }
    try {
      // J'ai intégré tes paramètres de réservation ici !
      const response = await api.post(`/trajets/${trajetId}/reserver`, {
        nombre_places: 1,
        type_reservation: 'CLASSIQUE'
      });
      
      if (response.data.success) {
        alert("🎉 " + response.data.message);
        setTrajets(trajets.map(t => t.id === trajetId ? { ...t, places_disponibles: t.places_disponibles - 1 } : t));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la réservation.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      
      {/* EN-TÊTE : LE FORMULAIRE DE RECHERCHE INTÉGRÉ */}
      <div className="bg-gainde-dark rounded-3xl shadow-lg p-6 mb-8">
        <form onSubmit={handleNouvelleRecherche} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">Départ</label>
            <input 
              type="text" 
              placeholder="Ex: Dakar"
              className="w-full px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-gainde-yellow"
              value={localDepart}
              onChange={(e) => setLocalDepart(e.target.value)}
            />
          </div>
          
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">Arrivée</label>
            <input 
              type="text" 
              placeholder="Ex: Thiès"
              className="w-full px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-gainde-yellow"
              value={localArrivee}
              onChange={(e) => setLocalArrivee(e.target.value)}
            />
          </div>
          
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">Date</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-gainde-yellow text-gray-700"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            className="w-full md:w-auto bg-gainde-yellow text-gainde-dark px-8 py-3 rounded-xl font-black hover:bg-yellow-500 transition shadow-md"
          >
            Rechercher
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-gainde-red p-6 rounded-xl text-center font-medium">
          {error}
        </div>
      )}
      
      {/* Résultat Vide */}
      {!loading && !error && trajets.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gainde-dark mb-2">Aucun trajet trouvé</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Aucun conducteur n'a prévu ce trajet avec vos critères. Essayez de changer la date ou la ville !
          </p>
        </div>
      )}

      {/* Liste des Trajets */}
      {!loading && trajets.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {trajets.map((trajet) => (
            <div key={trajet.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Infos Conducteur */}
              <div className="flex items-center gap-4 w-full md:w-1/3">
                <div className="w-14 h-14 bg-gainde-yellow rounded-full flex items-center justify-center text-xl font-black text-gainde-dark border border-gray-100 overflow-hidden">
                  {trajet.conducteur?.photo_profil ? (
                    <img src={`http://localhost:8000/storage/${trajet.conducteur.photo_profil}`} alt="Chauffeur" className="w-full h-full object-cover" />
                  ) : (
                    trajet.conducteur?.prenom?.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gainde-dark text-lg leading-tight">
                    {trajet.conducteur?.prenom} {trajet.conducteur?.nom}
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ⭐ {trajet.conducteur?.note_moyenne?.toFixed(1) || 'N/A'} • {trajet.vehicule?.marque_modele || "Véhicule standard"}
                  </p>
                </div>
              </div>

              {/* Infos Itinéraire */}
              <div className="flex flex-col items-center w-full md:w-1/3">
                <div className="flex justify-between w-full text-sm font-bold text-gray-400 mb-1">
                  <span>{trajet.date_heure_depart?.substring(11,16)}</span>
                  <span>{trajet.heure_arrivee_estimee ? trajet.heure_arrivee_estimee.substring(0,5) : '--:--'}</span>
                </div>
                <div className="w-full flex items-center gap-2">
                  <div className="w-3 h-3 bg-gainde-dark rounded-full"></div>
                  <div className="flex-1 h-0.5 bg-gray-200 relative">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-[10px] px-2 text-gray-400 font-bold rounded-full">TRAJET</div>
                  </div>
                  <div className="w-3 h-3 border-2 border-gainde-dark bg-white rounded-full"></div>
                </div>
                <div className="flex justify-between w-full text-sm font-bold text-gainde-dark mt-1">
                  <span>{trajet.ville_depart}</span>
                  <span>{trajet.ville_arrivee}</span>
                </div>
              </div>

              {/* Prix & ACTIONS */}
              <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-1/3">
                <div className="text-right">
                  <p className="text-2xl font-black text-gainde-dark">
                    {trajet.prix_par_place} FCFA
                  </p>
                  <p className={`text-sm font-bold mt-1 ${trajet.places_disponibles > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trajet.places_disponibles > 0 ? `${trajet.places_disponibles} places restantes` : 'Complet'}
                  </p>
                </div>

                {user && user.id === trajet.conducteur_id ? (
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => handleLiberePlace(trajet.id, trajet.places_disponibles, trajet.nombre_places_totales)}
                      disabled={trajet.places_disponibles >= trajet.nombre_places_totales}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition disabled:opacity-50 shadow-sm"
                      title="Un passager est descendu"
                    >
                      ➖
                    </button>
                    <button 
                      onClick={() => handleAjoutManuel(trajet.id, trajet.places_disponibles)}
                      disabled={trajet.places_disponibles <= 0}
                      className="bg-gray-100 text-gainde-dark px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50 shadow-sm"
                      title="Ajouter un passager"
                    >
                      ➕ Ajout (1)
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleReservation(trajet.id)}
                    disabled={trajet.places_disponibles <= 0}
                    className="bg-gainde-dark text-white px-6 py-2.5 rounded-xl font-bold mt-3 hover:bg-black transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md w-full md:w-auto"
                  >
                    {trajet.places_disponibles > 0 ? 'Réserver ma place' : 'Trajet Complet'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Recherche;