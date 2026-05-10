import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/passwordReset';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await forgotPassword(email.trim());
      setMessage(data.message || 'Si un compte existe, vous recevrez un email.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Une erreur est survenue. Réessayez plus tard.'
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
            Mot de passe oublié
          </h2>
          <p className="text-gray-500 mt-2">
            Recevez un lien de réinitialisation par email
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm font-medium rounded-r-xl">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-600 text-green-800 text-sm font-medium rounded-r-xl">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Adresse e-mail du compte
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="exemple@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Vous recevrez un lien valide environ 5 miniutes
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gainde-yellow text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-0.5 active:scale-95 ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-yellow-600'
            }`}
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          <Link to="/login" className="text-gainde-yellow font-bold hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;