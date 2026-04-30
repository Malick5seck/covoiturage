import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios'; // On importe notre connexion Laravel

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_actuel: 'PASSAGER'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. On envoie les données à Laravel
      const response = await api.post('/register', formData);

      // 2. Si ça marche, on sauvegarde le Token et on redirige !
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.location.href = '/'; // Direction l'accueil !
      }
    } catch (err) {
      // 3. S'il y a une erreur (ex: numéro déjà pris, mot de passe trop court)
      setError(
        err.response?.data?.message || 
        "Une erreur est survenue lors de l'inscription. Vérifiez vos informations."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] py-10">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gainde-dark">
            Rejoignez Warr Gaïndé
          </h2>
          <p className="text-gray-500 mt-2">Créez votre compte en quelques secondes</p>
        </div>

        {/* Affichage de l'erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Je souhaite utiliser l'application en tant que :
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, role_actuel: 'PASSAGER'})}
                className={`flex-1 py-3 rounded-xl border-2 font-bold transition ${
                  formData.role_actuel === 'PASSAGER' 
                  ? 'border-gainde-yellow bg-yellow-50 text-gainde-yellow' 
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                🎒 Passager
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, role_actuel: 'CHAUFFEUR'})}
                className={`flex-1 py-3 rounded-xl border-2 font-bold transition ${
                  formData.role_actuel === 'CHAUFFEUR' 
                  ? 'border-gainde-yellow bg-yellow-50 text-gainde-yellow' 
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                🚗 Chauffeur
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none transition"
                value={formData.prenom}
                onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none transition"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                required
                placeholder="770000000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none transition"
                value={formData.telephone}
                onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Optionnel)</label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none transition"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe</label>
              <input
                type="password"
                required
                placeholder="Minimum 8 caractères"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none transition"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmer</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none transition"
                value={formData.password_confirmation}
                onChange={(e) => setFormData({...formData, password_confirmation: e.target.value})}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 bg-gainde-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-0.5 ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'
            }`}
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-gainde-yellow font-bold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;