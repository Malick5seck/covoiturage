import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function MonVehicule() {
  const navigate = useNavigate();
  
  const [user] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  });

  // On stocke l'ID du véhicule s'il existe pour savoir si on fait un POST ou un PUT
  const [vehiculeId, setVehiculeId] = useState(null);
  
  const [formData, setFormData] = useState({
    marque_modele: '',
    immatriculation: '',
    nombre_places_max: '',
    climatisation: false,
    couleur: '',
    annee_fabrication: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role_actuel !== 'CHAUFFEUR') {
      navigate('/dashboard');
      return;
    }

    const fetchVehicule = async () => {
      try {
        // On utilise ta méthode index() qui renvoie un tableau 'data'
        const response = await api.get('/vehicules');
        const vehicules = response.data.data;

        if (vehicules && vehicules.length > 0) {
          const v = vehicules[0]; // On prend le premier véhicule
          setVehiculeId(v.id);
          setFormData({
            marque_modele: v.marque_modele || '',
            immatriculation: v.immatriculation || '',
            nombre_places_max: v.nombre_places_max || '',
            climatisation: v.climatisation === 1 || v.climatisation === true,
            couleur: v.couleur || '',
            annee_fabrication: v.annee_fabrication || ''
          });
        }
      } catch (err) {
        console.error("Erreur chargement véhicules", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicule();
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let response;
      
      if (vehiculeId) {
        // Si le véhicule existe, on utilise ta méthode update()
        response = await api.put(`/vehicules/${vehiculeId}`, {
          ...formData,
          climatisation: formData.climatisation ? 1 : 0
        });
      } else {
        // Sinon, on utilise ta méthode store()
        response = await api.post('/vehicules', {
          ...formData,
          climatisation: formData.climatisation ? 1 : 0
        });
        if (response.data.data) setVehiculeId(response.data.data.id);
      }

      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
      }
    } catch (err) {
      // Gestion des erreurs de validation (ex: immatriculation déjà prise)
      const errorMsg = err.response?.data?.errors 
        ? Object.values(err.response.data.errors).flat()[0]
        : err.response?.data?.message || "Une erreur est survenue.";
      
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div></div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        
        <div className="mb-10">
          <h1 className="text-3xl font-black text-gainde-dark">Mon Véhicule</h1>
          <p className="text-gray-500 mt-2">
            {vehiculeId ? "Modifier les informations de votre véhicule actuel." : "Enregistrez votre véhicule pour commencer à publier des trajets."}
          </p>
        </div>

        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl font-bold border-l-4 ${
            message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Marque & Modèle</label>
              <input 
                type="text" required placeholder="Ex: Toyota Dacia ou Ford"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 transition outline-none"
                value={formData.marque_modele}
                onChange={(e) => setFormData({...formData, marque_modele: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Immatriculation</label>
              <input 
                type="text" required placeholder="Ex: DK-1234-AB"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 transition outline-none uppercase"
                value={formData.immatriculation}
                onChange={(e) => setFormData({...formData, immatriculation: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Nombre de places passagers</label>
              <input 
                type="number" min="1" max="9" required
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 transition outline-none"
                value={formData.nombre_places_max}
                onChange={(e) => setFormData({...formData, nombre_places_max: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-2xl mt-7">
              <span className="font-bold text-gray-700">Climatisation ❄️</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" className="sr-only peer"
                  checked={formData.climatisation}
                  onChange={(e) => setFormData({...formData, climatisation: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gainde-yellow"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Couleur</label>
              <input 
                type="text" placeholder="Ex: Blanc cassé"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 transition outline-none"
                value={formData.couleur}
                onChange={(e) => setFormData({...formData, couleur: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Année</label>
              <input 
                type="number" min="1990" max={new Date().getFullYear()}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-gainde-yellow focus:ring-0 transition outline-none"
                value={formData.annee_fabrication}
                onChange={(e) => setFormData({...formData, annee_fabrication: e.target.value})}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-5 rounded-2xl font-black text-lg transition shadow-lg ${
              saving ? 'bg-gray-300' : 'bg-gainde-dark text-white hover:bg-black active:scale-[0.98]'
            }`}
          >
            {saving ? 'Traitement...' : vehiculeId ? 'Mettre à jour le véhicule' : 'Enregistrer le véhicule'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MonVehicule;