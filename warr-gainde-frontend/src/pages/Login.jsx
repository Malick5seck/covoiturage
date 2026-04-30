import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Importation de notre instance configurée

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    telephone: '',
    password: ''
  });

  // États pour le feedback utilisateur
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Appel à l'API Laravel
      const response = await api.post('/login', formData);

      if (response.data.success) {
        // 2. Sauvegarde du Token et des infos utilisateur dans le navigateur
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // 3. Redirection vers l'accueil (ou le dashboard)
        window.location.href = '/';;
      }
    } catch (err) {
      // Gestion des erreurs (identifiants incorrects, serveur hors ligne, etc.)
      setError(err.response?.data?.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gainde-dark">
            Bon retour !
          </h2>
          <p className="text-gray-500 mt-2">Connectez-vous à Warr Gaïndé</p>
        </div>

        {/* Affichage de l'erreur si elle existe */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              required
              placeholder="770000000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={formData.telephone}
              onChange={(e) => setFormData({...formData, telephone: e.target.value})}
              disabled={loading}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Mot de passe
              </label>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gainde-yellow text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-0.5 active:scale-95 ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-yellow-600'
            }`}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-gainde-yellow font-bold hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;