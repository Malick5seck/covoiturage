import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetPasswordPhone } from '../api/passwordReset';

function ResetPasswordPhone() {
  const navigate = useNavigate();
  const location = useLocation();
  const telephoneFromState = location.state?.telephone || '';

  const [telephone, setTelephone] = useState(telephoneFromState);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!telephoneFromState) {
      navigate('/forgot-password', { replace: true });
    }
  }, [telephoneFromState, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPasswordPhone({
        telephone,
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de mettre à jour le mot de passe. Recommencez la procédure.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!telephoneFromState) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gainde-dark">
            Nouveau mot de passe
          </h2>
          <p className="text-gray-500 mt-2">Compte lié à votre numéro</p>
        </div>

        {done && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-600 text-green-800 text-sm rounded-r-xl">
            Mot de passe mis à jour. Redirection vers la connexion…
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm font-medium rounded-r-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Téléphone (+221)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-medium">
                +221
              </span>
              <input
                type="tel"
                required
                className="w-full pl-14 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
                value={telephone}
                onChange={(e) =>
                  setTelephone(e.target.value.replace(/\D/g, '').slice(0, 9))
                }
                disabled={loading || done}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || done}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirmation
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              disabled={loading || done}
            />
          </div>

          <button
            type="submit"
            disabled={loading || done}
            className={`w-full bg-gainde-yellow text-white py-4 rounded-xl font-bold text-lg shadow-lg transition ${
              loading || done ? 'opacity-70 cursor-not-allowed' : 'hover:bg-yellow-600'
            }`}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          <Link to="/login" className="text-gainde-yellow font-bold hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPhone;
