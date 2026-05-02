import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';

function MonVehicule() {
  const navigate = useNavigate();
const [user] = useState(() => getUser());
  
  const [vehiculeId, setVehiculeId] = useState(null);
  const [formData, setFormData] = useState({
    marque_modele: '',
    immatriculation: '',
    nombre_places_max: '',
    climatisation: false,
    couleur: '',
    annee_fabrication: '',
  });

  // Photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoExistante, setPhotoExistante] = useState(null);

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
        const response = await api.get('/vehicules');
        const vehicules = response.data.data;

        if (vehicules && vehicules.length > 0) {
          const v = vehicules[0];
          setVehiculeId(v.id);
          setFormData({
            marque_modele:    v.marque_modele || '',
            immatriculation:  v.immatriculation || '',
            nombre_places_max: v.nombre_places_max || '',
            climatisation:    v.climatisation === 1 || v.climatisation === true,
            couleur:          v.couleur || '',
            annee_fabrication: v.annee_fabrication || '',
          });
          if (v.photo_vehicule) {
            setPhotoExistante(v.photo_vehicule);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicule();
  }, [user, navigate]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format non supporté. Utilisez JPG, PNG ou WEBP.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image trop lourde. Maximum 2 Mo.' });
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Photo obligatoire à la création
    if (!vehiculeId && !photoFile) {
      setMessage({ type: 'error', text: 'La photo du véhicule est obligatoire.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let response;
      const payload = {
        ...formData,
        climatisation: formData.climatisation ? 1 : 0,
      };

      if (vehiculeId) {
        response = await api.put(`/vehicules/${vehiculeId}`, payload);
      } else {
        response = await api.post('/vehicules', payload);
        if (response.data.data?.id) {
          setVehiculeId(response.data.data.id);
        }
      }

      const newVehiculeId = vehiculeId || response.data.data?.id;

      // Upload photo si une nouvelle a été sélectionnée
      if (photoFile && newVehiculeId) {
        const photoData = new FormData();
        photoData.append('photo', photoFile);

        const photoRes = await api.post(
          `/vehicules/${newVehiculeId}/photo`,
          photoData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (photoRes.data.photo_url) {
          setPhotoExistante(photoRes.data.photo_url);
          setPhotoFile(null);
          setPhotoPreview(null);
        }
      }

      setMessage({
        type: 'success',
        text: vehiculeId
          ? 'Véhicule mis à jour avec succès !'
          : 'Véhicule enregistré avec succès !',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : err.response?.data?.message || 'Une erreur est survenue.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  if (loading) return (
    <div className="text-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div>
    </div>
  );

  const photoActuelle = photoPreview || photoExistante;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-gainde-dark">Mon Véhicule</h1>
          <p className="text-gray-500 mt-2">
            {vehiculeId
              ? 'Modifiez les informations de votre véhicule.'
              : 'Enregistrez votre véhicule pour publier des trajets.'}
          </p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-2xl font-bold border-l-4 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-700'
              : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* PHOTO DU VÉHICULE */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Photo du véhicule{' '}
              {!vehiculeId && (
                <span className="text-red-500 font-bold">* obligatoire</span>
              )}
            </label>

            <label htmlFor="photo-vehicule" className="cursor-pointer block">
              <div className={`relative w-full h-52 rounded-2xl overflow-hidden border-2 border-dashed transition flex items-center justify-center ${
                photoActuelle
                  ? 'border-gainde-yellow'
                  : !vehiculeId
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              } hover:border-gainde-yellow hover:bg-yellow-50`}>

                {photoActuelle ? (
                  <>
                    <img
                      src={photoActuelle}
                      alt="Aperçu véhicule"
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay au survol */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition flex items-center justify-center">
                      <span className="text-white font-bold opacity-0 hover:opacity-100 text-sm">
                        Changer la photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">📷</div>
                    <p className="font-bold text-gray-600">
                      Cliquez pour ajouter une photo
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      JPG, PNG ou WEBP — max 2 Mo
                    </p>
                    {!vehiculeId && (
                      <p className="text-xs text-red-500 font-bold mt-2">
                        Une photo est requise pour enregistrer votre véhicule
                      </p>
                    )}
                  </div>
                )}
              </div>
              <input
                id="photo-vehicule"
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>

            {photoFile && (
              <p className="mt-2 text-sm text-green-600 font-semibold">
                ✓ {photoFile.name} sélectionné
              </p>
            )}
          </div>

          {/* INFOS VÉHICULE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Marque & Modèle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Toyota Hiace"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gainde-yellow outline-none transition border border-transparent focus:border-gainde-yellow"
                value={formData.marque_modele}
                onChange={(e) => setFormData({ ...formData, marque_modele: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: DK-1234-AB"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gainde-yellow outline-none transition border border-transparent focus:border-gainde-yellow uppercase"
                value={formData.immatriculation}
                onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Nombre de places passagers <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="9"
                required
                placeholder="Ex: 7"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gainde-yellow outline-none transition border border-transparent focus:border-gainde-yellow"
                value={formData.nombre_places_max}
                onChange={(e) => setFormData({ ...formData, nombre_places_max: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-2xl mt-7 border border-transparent">
              <span className="font-bold text-gray-700">Climatisation ❄️</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.climatisation}
                  onChange={(e) => setFormData({ ...formData, climatisation: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-gainde-yellow peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Couleur</label>
              <input
                type="text"
                placeholder="Ex: Blanc cassé"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gainde-yellow outline-none transition border border-transparent focus:border-gainde-yellow"
                value={formData.couleur}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Année de fabrication</label>
              <input
                type="number"
                min="1990"
                max={new Date().getFullYear()}
                placeholder="Ex: 2018"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gainde-yellow outline-none transition border border-transparent focus:border-gainde-yellow"
                value={formData.annee_fabrication}
                onChange={(e) => setFormData({ ...formData, annee_fabrication: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-5 rounded-2xl font-black text-lg transition shadow-lg ${
              saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gainde-dark text-white hover:bg-black active:scale-[0.98]'
            }`}
          >
            {saving
              ? 'Enregistrement...'
              : vehiculeId
              ? 'Mettre à jour le véhicule'
              : 'Enregistrer mon véhicule'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MonVehicule;