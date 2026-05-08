import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Login() {
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { identifiant, password });

      if (response.data.success) {
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.role_actuel === 'ADMIN') {
          window.location.href = '/admin';
        } else if (user.role_actuel === 'CHAUFFEUR') {
          window.location.href = '/mes-trajets';
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Identifiants incorrects. Vérifiez vos informations.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gainde-dark">Bon retour !</h2>
          <p className="text-gray-500 mt-2">Connectez-vous à Warr Gaïndé</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm font-medium rounded-r-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email ou téléphone
            </label>
            <input
              type="text"
              required
              placeholder="exemple@email.com ou 771234567"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
              <Link to="/forgot-password" className="text-sm text-gainde-yellow hover:underline font-medium">
                Oublié ?
              </Link>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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