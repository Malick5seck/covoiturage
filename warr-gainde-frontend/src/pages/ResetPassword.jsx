import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/passwordReset';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const emailParam = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [email, setEmail] = useState(() => decodeURIComponent(emailParam));
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Lien incomplet ou expiré. Demandez un nouveau lien depuis la page « Mot de passe oublié ».');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        token,
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de réinitialiser le mot de passe. Le lien est peut-être expiré.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gainde-dark">
            Nouveau mot de passe
          </h2>
          <p className="text-gray-500 mt-2">Compte e-mail utilisé sur Warr Gaïndé</p>
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
              E-mail
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || done}
            />
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
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
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

export default ResetPassword;
