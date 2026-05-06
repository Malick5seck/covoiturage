import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  forgotPassword,
  forgotPasswordPhone,
} from '../api/passwordReset';

function ForgotPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+221/, '');
    const regex = /^7[0-8]\d{7}$/;
    if (cleaned.length < 9) return 'Le numéro doit contenir 9 chiffres';
    if (!regex.test(cleaned)) {
      return 'Numéro invalide. Doit commencer par 70, 71, 72, 76, 77 ou 78';
    }
    return '';
  };

  useEffect(() => {
    if (mode === 'telephone') {
      setPhoneError(validatePhone(telephone));
    }
  }, [telephone, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'telephone' && phoneError) return;

    setLoading(true);
    try {
      if (mode === 'email') {
        const { data } = await forgotPassword(email.trim());
        setMessage(data.message || 'Demande enregistrée.');
      } else {
        await forgotPasswordPhone(telephone);
        navigate('/verify-otp', {
          state: {
            telephone,
            info: 'Si un compte existe pour ce numéro, vous avez reçu un code par SMS.',
          },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Une erreur est survenue. Réessayez plus tard.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setTelephone(value);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gainde-dark">
            Mot de passe oublié
          </h2>
          <p className="text-gray-500 mt-2">
            Choisissez comment recevoir la réinitialisation
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Méthode :
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setMode('telephone');
                setError('');
                setMessage('');
              }}
              className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'telephone'
                  ? 'border-gainde-yellow bg-yellow-50 text-gainde-dark'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              📱 Téléphone
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('email');
                setError('');
                setMessage('');
              }}
              className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'email'
                  ? 'border-gainde-yellow bg-yellow-50 text-gainde-dark'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              ✉️ E-mail
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm font-medium rounded-r-xl">
            {error}
          </div>
        )}
        {message && mode === 'email' && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-600 text-green-800 text-sm font-medium rounded-r-xl">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'email' ? (
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
                Vous recevrez un lien valide environ une heure (vérifiez vos
                spams).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-medium">
                  +221
                </span>
                <input
                  type="tel"
                  required
                  placeholder="771234567"
                  className={`w-full pl-14 pr-4 py-3 rounded-xl border transition outline-none ${
                    phoneError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20'
                  }`}
                  value={telephone}
                  onChange={handlePhoneChange}
                  disabled={loading}
                />
              </div>
              {phoneError && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  {phoneError}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Un code à 6 chiffres sera envoyé par SMS (valide 10 minutes).
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading || (mode === 'telephone' && !!phoneError)
            }
            className={`w-full bg-gainde-yellow text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-0.5 active:scale-95 ${
              loading || (mode === 'telephone' && !!phoneError)
                ? 'opacity-70 cursor-not-allowed'
                : 'hover:bg-yellow-600'
            }`}
          >
            {loading
              ? 'Envoi en cours...'
              : mode === 'email'
                ? 'Envoyer le lien'
                : 'Recevoir le code SMS'}
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
