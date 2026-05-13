import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';
import { toast } from '../utils/toast';

function MonVehicule() {
  const navigate = useNavigate();
  const [user] = useState(() => getUser());

  const [vehicules, setVehicules] = useState([]);
  const [vehiculeId, setVehiculeId] = useState(null);

  const emptyForm = {
    marque_modele: '',
    immatriculation: '',
    nombre_places_max: '',
    climatisation: false,
    couleur: '',
    annee_fabrication: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoExistante, setPhotoExistante] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // États pour les erreurs par champ
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchVehicules = useCallback(async () => {
    try {
      const res = await api.get('/vehicules');
      setVehicules(res.data.data || []);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role_actuel !== 'CHAUFFEUR') { navigate('/'); return; }

    const init = async () => {
      await fetchVehicules();
    };

    init();
  }, [fetchVehicules, navigate, user]);

  // Validation d'un champ
  const validateField = (name, value) => {
    let erreur = '';
    switch (name) {
      case 'marque_modele':
        if (!value.trim()) erreur = 'La marque et le modèle sont obligatoires.';
        else if (value.trim().length < 3) erreur = 'Minimum 3 caractères.';
        break;
      case 'immatriculation':
        if (!value.trim()) erreur = "L'immatriculation est obligatoire.";
        else if (value.trim().length < 4) erreur = 'Immatriculation trop courte.';
        break;
      case 'nombre_places_max':
        if (!value) erreur = 'Le nombre de places est obligatoire.';
        else if (parseInt(value) < 1 || parseInt(value) > 9) erreur = 'Entre 1 et 9 places.';
        break;
      case 'annee_fabrication':
        if (value && (parseInt(value) < 1990 || parseInt(value) > new Date().getFullYear())) {
          erreur = `Année entre 1990 et ${new Date().getFullYear()}.`;
        }
        break;
      default:
        break;
    }
    setFieldErrors(prev => ({ ...prev, [name]: erreur }));
    return erreur;
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateForm = () => {
    const erreurs = {};
    ['marque_modele', 'immatriculation', 'nombre_places_max'].forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) erreurs[key] = err;
    });
    if (formData.annee_fabrication) {
      const err = validateField('annee_fabrication', formData.annee_fabrication);
      if (err) erreurs.annee_fabrication = err;
    }
    setFieldErrors(erreurs);
    return Object.keys(erreurs).length === 0;
  };

  const loadIntoForm = (v) => {
    setVehiculeId(v.id);
    setFormData({
      marque_modele: v.marque_modele || '',
      immatriculation: v.immatriculation || '',
      nombre_places_max: v.nombre_places_max || '',
      climatisation: v.climatisation === 1 || v.climatisation === true,
      couleur: v.couleur || '',
      annee_fabrication: v.annee_fabrication || '',
    });
    setPhotoExistante(v.photo_vehicule || null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setMessage({ type: '', text: '' });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setVehiculeId(null);
    setFormData(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoExistante(null);
    setMessage({ type: '', text: '' });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
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

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs avant d\'enregistrer.');
      return;
    }

    if (!vehiculeId && !photoFile) {
      setMessage({ type: 'error', text: 'La photo du véhicule est obligatoire.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = { ...formData, climatisation: formData.climatisation ? 1 : 0 };
      let response;

      if (vehiculeId) {
        response = await api.put(`/vehicules/${vehiculeId}`, payload);
      } else {
        response = await api.post('/vehicules', payload);
      }

      const newId = vehiculeId || response.data.data?.id;

      if (photoFile && newId) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        const photoRes = await api.post(`/vehicules/${newId}/photo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (photoRes.data.photo_url) setPhotoExistante(photoRes.data.photo_url);
        setPhotoFile(null);
        setPhotoPreview(null);
      }

      setMessage({
        type: 'success',
        text: vehiculeId ? 'Véhicule mis à jour avec succès !' : 'Véhicule enregistré avec succès !',
      });

      await fetchVehicules();

      // ✅ Réinitialisation du formulaire après un nouvel enregistrement
      if (!vehiculeId) {
        resetForm();
      }
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

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce véhicule ? Cette action est irréversible.')) return;
    setDeleting(id);
    try {
      await api.delete(`/vehicules/${id}`);
      toast.success('Véhicule supprimé.');
      if (vehiculeId === id) resetForm();
      await fetchVehicules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent" />
    </div>
  );

  const photoActuelle = photoPreview || photoExistante;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">

      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black text-gainde-dark">
              {vehiculeId ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
            </h1>
            <p className="text-gray-500 mt-1">
              {vehiculeId
                ? 'Modifiez les informations et enregistrez.'
                : 'Enregistrez votre véhicule pour publier des trajets.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton Retour */}
            <button
              onClick={() => navigate('/mes-trajets')}
              className="bg-gainde-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl transition hover:bg-black flex items-center gap-1.5 shadow-sm"
        >
               Retour
            </button>
            {vehiculeId && (
              <button
                onClick={resetForm}
                className="text-sm font-bold text-gray-400 hover:text-gainde-dark bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition"
              >
                ➕ Nouveau
              </button>
            )}
          </div>
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

          {/* PHOTO */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Photo du véhicule{' '}
              {!vehiculeId && <span className="text-red-500 font-bold">* obligatoire</span>}
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
                  <img src={photoActuelle} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">📷</div>
                    <p className="font-bold text-gray-600">Cliquez pour ajouter une photo</p>
                    <p className="text-sm text-gray-400 mt-1">JPG, PNG ou WEBP — max 2 Mo</p>
                    {!vehiculeId && (
                      <p className="text-xs text-red-500 font-bold mt-2">
                        Une photo est requise
                      </p>
                    )}
                  </div>
                )}
              </div>
              <input id="photo-vehicule" type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                className="hidden" onChange={handlePhotoChange} />
            </label>
            {photoFile && (
              <p className="mt-2 text-sm text-green-600 font-semibold">✓ {photoFile.name} sélectionné</p>
            )}
          </div>

          {/* INFOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Marque & Modèle <span className="text-red-500">*</span>
              </label>
              <input type="text" name="marque_modele" required placeholder="Ex: Toyota Hiace"
                className={`w-full px-5 py-4 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-gainde-yellow outline-none transition border ${
                  fieldErrors.marque_modele ? 'border-red-500' : 'border-transparent focus:border-gainde-yellow'
                }`}
                value={formData.marque_modele}
                onChange={handleFieldChange} />
              {fieldErrors.marque_modele && <p className="text-red-500 text-xs">{fieldErrors.marque_modele}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input type="text" name="immatriculation" required placeholder="Ex: DK-1234-AB"
                className={`w-full px-5 py-4 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-gainde-yellow outline-none transition border uppercase ${
                  fieldErrors.immatriculation ? 'border-red-500' : 'border-transparent focus:border-gainde-yellow'
                }`}
                value={formData.immatriculation}
                onChange={handleFieldChange} />
              {fieldErrors.immatriculation && <p className="text-red-500 text-xs">{fieldErrors.immatriculation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Nombre de places passagers <span className="text-red-500">*</span>
              </label>
              <input type="number" name="nombre_places_max" min="1" max="9" required placeholder="Ex: 7"
                className={`w-full px-5 py-4 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-gainde-yellow outline-none transition border ${
                  fieldErrors.nombre_places_max ? 'border-red-500' : 'border-transparent focus:border-gainde-yellow'
                }`}
                value={formData.nombre_places_max}
                onChange={handleFieldChange} />
              {fieldErrors.nombre_places_max && <p className="text-red-500 text-xs">{fieldErrors.nombre_places_max}</p>}
            </div>

            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-2xl mt-7 border border-transparent">
              <div>
                <p className="font-bold text-gray-700">Climatisation ❄️</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formData.climatisation ? 'Véhicule climatisé' : 'Sans climatisation'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer"
                  checked={formData.climatisation}
                  onChange={e => setFormData({ ...formData, climatisation: e.target.checked })} />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-gainde-yellow peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Couleur</label>
              <input type="text" placeholder="Ex: Blanc cassé"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gainde-yellow outline-none transition border border-transparent focus:border-gainde-yellow"
                value={formData.couleur}
                onChange={e => setFormData({ ...formData, couleur: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Année de fabrication</label>
              <input type="number" name="annee_fabrication" min="1990" max={new Date().getFullYear()} placeholder="Ex: 2018"
                className={`w-full px-5 py-4 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-gainde-yellow outline-none transition border ${
                  fieldErrors.annee_fabrication ? 'border-red-500' : 'border-transparent focus:border-gainde-yellow'
                }`}
                value={formData.annee_fabrication}
                onChange={handleFieldChange} />
              {fieldErrors.annee_fabrication && <p className="text-red-500 text-xs">{fieldErrors.annee_fabrication}</p>}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className={`w-full py-5 rounded-2xl font-black text-lg transition shadow-lg ${
              saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gainde-dark text-white hover:bg-black active:scale-[0.98]'
            }`}>
            {saving
              ? 'Enregistrement...'
              : vehiculeId
              ? 'Mettre à jour le véhicule'
              : 'Enregistrer mon véhicule'}
          </button>
        </form>
      </div>

      {/* ── LISTE DES VÉHICULES ──────────────────────────────────────────────── */}
      {vehicules.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-gainde-dark mb-4">
            Ma flotte ({vehicules.length} véhicule{vehicules.length > 1 ? 's' : ''})
          </h2>

          <div className="grid gap-4">
            {vehicules.map((v) => (
              <div key={v.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                  vehiculeId === v.id ? 'border-gainde-yellow ring-2 ring-gainde-yellow/30' : 'border-gray-100'
                }`}>
                <div className="flex flex-col sm:flex-row gap-0">
                  <div className="w-full sm:w-36 h-36 shrink-0 bg-gray-100 overflow-hidden">
                    {v.photo_vehicule ? (
                      <img src={v.photo_vehicule} alt={v.marque_modele}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        🚗
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-black text-gainde-dark text-lg">{v.marque_modele}</h3>
                        {vehiculeId === v.id && (
                          <span className="text-xs bg-gainde-yellow text-gainde-dark font-bold px-2 py-0.5 rounded-full">
                            En cours d'édition
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          🔑 {v.immatriculation}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          👥 {v.nombre_places_max} places
                        </span>
                        {v.climatisation ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                            ❄️ Climatisé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
                            🌬️ Sans clim
                          </span>
                        )}
                        {v.couleur && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                            🎨 {v.couleur}
                          </span>
                        )}
                        {v.annee_fabrication && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                            📅 {v.annee_fabrication}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => loadIntoForm(v)}
                        className="flex-1 sm:flex-none bg-gainde-dark text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition">
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        disabled={deleting === v.id}
                        className="flex-1 sm:flex-none bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition disabled:opacity-50">
                        {deleting === v.id ? 'Suppression...' : '🗑️ Supprimer'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vehicules.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-4xl mb-3">🚗</p>
          <p className="text-gray-400 font-medium">Aucun véhicule enregistré pour l'instant.</p>
          <p className="text-gray-400 text-sm mt-1">Remplissez le formulaire ci-dessus pour ajouter votre premier véhicule.</p>
        </div>
      )}
    </div>
  );
}

export default MonVehicule;