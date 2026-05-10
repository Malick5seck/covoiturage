import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  });

  const [formData, setFormData] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    telephone: user?.telephone || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    ancien_mot_de_passe: '',
    nouveau_mot_de_passe: '',
    nouveau_mot_de_passe_confirmation: ''
  });

  const [photo, setPhoto] = useState(null);

  // Initialise l'aperçu avec l'URL complète stockée (ou null)
  const [photoPreview, setPhotoPreview] = useState(user?.photo_profil || null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file)); // aperçu local temporaire
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Mettre à jour les champs texte
      const resInfos = await api.put('/profil', formData);
      let updatedUser = resInfos.data.user;

      // 2. Upload de la photo si une nouvelle a été choisie
      if (photo) {
        const photoData = new FormData();
        photoData.append('photo', photo);

        const resPhoto = await api.post('/profil/photo', photoData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // L'API renvoie l'URL complète, on la stocke telle quelle
        const photoUrl = resPhoto.data.photo_url;
        updatedUser = { ...updatedUser, photo_profil: photoUrl };
        setPhotoPreview(photoUrl); // remplace l'aperçu local par l'URL distante
      }

      // 3. Changement de mot de passe (si renseigné)
      if (passwordData.ancien_mot_de_passe || passwordData.nouveau_mot_de_passe) {
        if (passwordData.nouveau_mot_de_passe !== passwordData.nouveau_mot_de_passe_confirmation) {
          throw new Error("Les nouveaux mots de passe ne correspondent pas.");
        }
        await api.post('/profil/mot-de-passe', passwordData);
        setPasswordData({
          ancien_mot_de_passe: '',
          nouveau_mot_de_passe: '',
          nouveau_mot_de_passe_confirmation: '',
        });
      }

      // 4. Mettre à jour local storage et état local
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || err.response?.data?.message || 'Erreur lors de la mise à jour.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-black text-gainde-dark mb-8">Mon Profil</h1>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl font-bold ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION PHOTO */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-100">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-gray-400">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  user.prenom.charAt(0)
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-gainde-yellow text-gainde-dark p-2 rounded-full cursor-pointer hover:scale-110 transition shadow-md">
                📷
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-3">Cliquez sur l'icône pour modifier votre avatar</p>
          </div>

          {/* INFOS UTILISATEUR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Prénom</label>
              <input
                type="text"
                name="prenom"
                required
                value={formData.prenom}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nom</label>
              <input
                type="text"
                name="nom"
                required
                value={formData.nom}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                name="telephone"
                required
                value={formData.telephone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none bg-gray-50"
              />
            </div>
          </div>

          {/* MOT DE PASSE */}
          <div className="mt-10 pt-8 border-t border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4">🔒 Changer de mot de passe</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ancien mot de passe</label>
                <input
                  type="password"
                  name="ancien_mot_de_passe"
                  value={passwordData.ancien_mot_de_passe}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  onChange={handlePasswordChange}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  name="nouveau_mot_de_passe"
                  value={passwordData.nouveau_mot_de_passe}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  onChange={handlePasswordChange}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirmer le nouveau</label>
                <input
                  type="password"
                  name="nouveau_mot_de_passe_confirmation"
                  value={passwordData.nouveau_mot_de_passe_confirmation}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  onChange={handlePasswordChange}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg mt-8 ${
              loading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gainde-dark text-white hover:bg-black'
            }`}
          >
            {loading ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profil;