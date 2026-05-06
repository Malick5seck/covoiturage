import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

function Portefeuille() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [solde, setSolde] = useState(0);
  const [montant, setMontant] = useState('');
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role_actuel !== 'CHAUFFEUR') {
      navigate('/');
      return;
    }

    // Si on revient de PayDunya avec un token en attente, on vérifie
    const token = searchParams.get('token');
    const status = searchParams.get('status');

    if (token && status === 'succes') {
      api.post(`/portefeuille/verifier/${token}`)
        .then(res => {
          if (res.data.statut === 'REUSSI') {
            setSolde(res.data.nouveau_solde);
            setMessage({ type: 'success', text: 'Recharge confirmée avec succès !' });
          }
        })
        .catch(() => {});
    }

    const fetchData = async () => {
      try {
        const [userRes, histRes] = await Promise.all([
          api.get('/user'),
          api.get('/portefeuille/historique'),
        ]);
        setSolde(userRes.data.solde_portefeuille || 0);
        setHistorique(histRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, searchParams]);

  const handleRecharge = async (methode) => {
    if (!montant || montant < 500) {
      setMessage({ type: 'error', text: 'Montant minimum : 500 FCFA' });
      return;
    }
    setPaying(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await api.post('/portefeuille/initier', { montant });
      if (res.data.success) {
        // Redirection vers la page de paiement PayDunya
        window.location.href = res.data.payment_url;
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Erreur lors de l\'initiation du paiement.',
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="text-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gainde-dark">Mon Portefeuille</h1>
        <p className="text-gray-500 mt-2">
          Rechargez votre solde pour couvrir les commissions de la plateforme.
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl font-bold border-l-4 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-500 text-green-700'
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        {/* CARTE SOLDE */}
        <div className="bg-gainde-dark text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5"></div>
          <p className="text-gray-300 font-semibold mb-2">Solde disponible</p>
          <h2 className="text-4xl font-black">
            {parseFloat(solde).toLocaleString('fr-FR')}
            <span className="text-xl text-gainde-yellow ml-2">FCFA</span>
          </h2>
          {solde < 0 ? (
            <p className="text-red-400 text-sm mt-4 font-bold">
              ⚠️ Solde négatif — rechargez pour continuer à publier.
            </p>
          ) : (
            <p className="text-green-400 text-sm mt-4 font-bold">✅ Compte en règle</p>
          )}
        </div>

        {/* FORMULAIRE RECHARGE */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gainde-dark mb-4">Recharger mon compte</h3>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Montant (FCFA)
            </label>
            <input
              type="number"
              min="500"
              step="500"
              placeholder="Ex: 5000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
            {/* Raccourcis montants */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[1000, 2500, 5000, 10000].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMontant(m)}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-bold hover:bg-gray-200 transition"
                >
                  {m.toLocaleString()} F
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleRecharge('wave')}
              disabled={paying}
              className="w-full flex items-center justify-center gap-3 bg-[#1B5ED4] text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {paying ? 'Redirection...' : '🌊 Payer avec Wave'}
            </button>

            <button
              onClick={() => handleRecharge('orange')}
              disabled={paying}
              className="w-full flex items-center justify-center gap-3 bg-[#FF6600] text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {paying ? 'Redirection...' : '🟧 Payer avec Orange Money'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Paiement sécurisé via PayDunya
          </p>
        </div>
      </div>

      {/* HISTORIQUE */}
      {historique.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gainde-dark">Historique des transactions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {historique.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-bold text-gainde-dark">
                    {t.type_transaction === 'RECHARGE' ? '⬆ Recharge' : '⬇ Commission prélevée'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(t.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${
                    t.type_transaction === 'RECHARGE' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {t.type_transaction === 'RECHARGE' ? '+' : '-'}
                    {parseFloat(t.montant).toLocaleString('fr-FR')} FCFA
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    t.statut === 'REUSSI'
                      ? 'bg-green-100 text-green-700'
                      : t.statut === 'EN_ATTENTE'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {t.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Portefeuille;