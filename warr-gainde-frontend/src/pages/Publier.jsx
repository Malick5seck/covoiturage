import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Publier() {
  const navigate = useNavigate();
  
  const [mesVehicules, setMesVehicules] = useState([]);

  // Sécurité : On vérifie que l'utilisateur est bien connecté
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // On charge les véhicules du chauffeur pour le menu déroulant
    const fetchVehicules = async () => {
      try {
        const res = await api.get('/vehicules');
        setMesVehicules(res.data.data || []);
      } catch (err) {
        console.error("Erreur lors du chargement des véhicules", err);
      }
    };

    fetchVehicules();
  }, [navigate]);

  const [formData, setFormData] = useState({
    ville_depart: '',
    ville_arrivee: '',
    date_depart: '',
    heure_depart: '',
    heure_arrivee_estimee: '',
    prix_place: '',
    vehicule_id: '' // Remplacé "places_disponibles" par l'ID du véhicule
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // On envoie les données du trajet à Laravel
      const response = await api.post('/trajets', formData);

      if (response.status === 201 || response.status === 200) {
        setSuccess(true);
        // Redirection vers l'accueil ou la recherche après 2 secondes
        setTimeout(() => {
          navigate(`/recherche?depart=${formData.ville_depart}&arrivee=${formData.ville_arrivee}`);
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Une erreur est survenue lors de la publication du trajet."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gainde-dark">
            Publier un trajet
          </h1>
          <p className="text-gray-500 mt-2">Où allez-vous conduire aujourd'hui ?</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-gainde-green text-gainde-green font-medium">
            ✅ Trajet publié avec succès ! Redirection en cours...
          </div>
        )}

        {/* ALERTE SI AUCUN VÉHICULE N'EST ENREGISTRÉ */}
        {mesVehicules.length === 0 && !loading && (
           <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-gainde-yellow text-yellow-800 font-medium flex justify-between items-center">
             <span>⚠️ Vous devez enregistrer un véhicule avant de publier un trajet.</span>
             <button onClick={() => navigate('/mon-vehicule')} className="bg-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
               Ajouter un véhicule
             </button>
           </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ITINÉRAIRE */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">📍 Itinéraire</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ville de départ</label>
                <input type="text" required placeholder="Ex: Dakar"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.ville_depart}
                  onChange={(e) => setFormData({...formData, ville_depart: e.target.value})}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ville d'arrivée</label>
                <input type="text" required placeholder="Ex: Thiès"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.ville_arrivee}
                  onChange={(e) => setFormData({...formData, ville_arrivee: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* DATES ET HEURES */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">🕒 Horaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input type="date" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.date_depart}
                  onChange={(e) => setFormData({...formData, date_depart: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Heure départ</label>
                <input type="time" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.heure_depart}
                  onChange={(e) => setFormData({...formData, heure_depart: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Heure d'arrivée (est.)</label>
                <input type="time" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.heure_arrivee_estimee}
                  onChange={(e) => setFormData({...formData, heure_arrivee_estimee: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* VÉHICULE ET PRIX */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">💳 Détails du voyage</h3>
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* LE NOUVEAU MENU DÉROULANT DU VÉHICULE */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Véhicule utilisé</label>
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none bg-white"
                  value={formData.vehicule_id}
                  onChange={(e) => setFormData({...formData, vehicule_id: e.target.value})}
                >
                  <option value="">Sélectionnez un véhicule...</option>
                  {mesVehicules.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.marque_modele} ({v.immatriculation}) - {v.nombre_places_max} places max
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Prix par place (FCFA)</label>
                <input type="number" min="500" step="100" required placeholder="Ex: 2500"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.prix_place}
                  onChange={(e) => setFormData({...formData, prix_place: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success || mesVehicules.length === 0}
            className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform ${
              loading || success || mesVehicules.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gainde-dark hover:bg-gray-800 hover:-translate-y-0.5'
            }`}
          >
            {loading ? 'Publication en cours...' : 'Publier ce trajet'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Publier;