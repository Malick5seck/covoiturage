import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Login() {
  const navigate = useNavigate();
  
  const [onglet, setOnglet] = useState('telephone');

  const [formPhone, setFormPhone] = useState({ telephone: '', password: '' });
  const [formEmail, setFormEmail] = useState({ email: '', password: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Validation Téléphone
  const validatePhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+221/, '');
    const regex = /^7[0-8]\d{7}$/;

    if (cleaned.length < 9) return "Le numéro doit contenir 9 chiffres";
    if (!regex.test(cleaned)) return "Numéro invalide. Doit commencer par 70, 71, 72, 76, 77 ou 78";
    return '';
  };

  // Validation Email
  const validateEmail = (email) => {
    if (!email) return '';
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email) ? '' : "Adresse email invalide";
  };

  // Validation temps réel
  useEffect(() => {
    if (onglet === 'telephone') {
      setPhoneError(validatePhone(formPhone.telephone));
    } else {
      setEmailError(validateEmail(formEmail.email));
    }
  }, [formPhone.telephone, formEmail.email, onglet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (onglet === 'telephone' && phoneError) return;
    if (onglet === 'email' && emailError) return;

    setLoading(true);

    const payload = onglet === 'telephone' ? formPhone : formEmail;

    try {
      const response = await api.post('/login', payload);

      if (response.data.success) {
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.role_actuel === 'ADMIN') {
          window.location.href = '/admin';
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

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setFormPhone({ ...formPhone, telephone: value });
  };

  const handleEmailChange = (e) => {
    setFormEmail({ ...formEmail, email: e.target.value.trim() });
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gainde-dark">
            Bon retour !
          </h2>
          <p className="text-gray-500 mt-2">Connectez-vous à Warr Gaïndé</p>
        </div>

        {/* === Onglets style Passager / Chauffeur === */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Se connecter avec :
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => { 
                setOnglet('telephone'); 
                setError(''); 
                setPhoneError(''); 
              }}
              className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${
                onglet === 'telephone'
                  ? 'border-gainde-yellow bg-yellow-50 text-gainde-dark'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              📱 Téléphone
            </button>

            <button
              type="button"
              onClick={() => { 
                setOnglet('email'); 
                setError(''); 
                setEmailError(''); 
              }}
              className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${
                onglet === 'email'
                  ? 'border-gainde-yellow bg-yellow-50 text-gainde-dark'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              ✉️ Email
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red text-sm font-medium rounded-r-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Téléphone */}
          {onglet === 'telephone' && (
            <>
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
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20'
                    }`}
                    value={formPhone.telephone}
                    onChange={handlePhoneChange}
                    disabled={loading}
                  />
                </div>
                {phoneError && <p className="mt-2 text-sm text-red-600 font-medium">{phoneError}</p>}
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
                  value={formPhone.password}
                  onChange={(e) => setFormPhone({ ...formPhone, password: e.target.value })}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Email */}
          {onglet === 'email' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemple@email.com"
                  className={`w-full px-4 py-3 rounded-xl border transition outline-none ${
                    emailError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-gainde-yellow focus:ring-2 focus:ring-gainde-yellow/20'
                  }`}
                  value={formEmail.email}
                  onChange={handleEmailChange}
                  disabled={loading}
                />
                {emailError && <p className="mt-2 text-sm text-red-600 font-medium">{emailError}</p>}
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
                  value={formEmail.password}
                  onChange={(e) => setFormEmail({ ...formEmail, password: e.target.value })}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || 
                     (onglet === 'telephone' && !!phoneError) || 
                     (onglet === 'email' && !!emailError)}
            className={`w-full bg-gainde-yellow text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-0.5 active:scale-95 ${
              loading || (onglet === 'telephone' && !!phoneError) || (onglet === 'email' && !!emailError)
                ? 'opacity-70 cursor-not-allowed' 
                : 'hover:bg-yellow-600'
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