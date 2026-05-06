import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { verifyOtp } from '../api/passwordReset';

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const telephoneFromState = location.state?.telephone || '';
  const info = location.state?.info;

  const [telephone, setTelephone] = useState(telephoneFromState);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!telephoneFromState) {
      navigate('/forgot-password', { replace: true });
    }
  }, [telephoneFromState, navigate]);

  const handleOtpChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Saisissez les 6 chiffres reçus par SMS.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({ telephone, otp });
      navigate('/reset-password-phone', {
        state: { telephone },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Code incorrect ou expiré. Vous pouvez redemander un code depuis l’étape précédente.'
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
            Code SMS
          </h2>
          <p className="text-gray-500 mt-2">
            Entrez le code à 6 chiffres envoyé sur votre téléphone
          </p>
        </div>

        {info && (
          <div className="mb-6 p-4 bg-yellow-50 border border-gainde-yellow/30 text-gainde-dark text-sm rounded-xl">
            {info}
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
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Code OTP
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 tracking-[0.5em] text-center text-xl font-mono focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20 outline-none transition"
              value={otp}
              onChange={handleOtpChange}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className={`w-full bg-gainde-yellow text-white py-4 rounded-xl font-bold text-lg shadow-lg transition ${
              loading || otp.length !== 6
                ? 'opacity-70 cursor-not-allowed'
                : 'hover:bg-yellow-600'
            }`}
          >
            {loading ? 'Vérification…' : 'Vérifier le code'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          <Link
            to="/forgot-password"
            className="text-gainde-yellow font-bold hover:underline"
          >
            Redemander un code
          </Link>
          {' · '}
          <Link to="/login" className="text-gray-500 hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyOtp;
