import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Portefeuille() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  });

  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role_actuel !== 'CHAUFFEUR') {
      navigate('/dashboard');
      return;
    }

    // Fonction pour récupérer le solde actuel de l'utilisateur
    const fetchWallet = async () => {
      try {
        // Assure-toi d'avoir une route '/user' ou '/profile' qui renvoie les infos de l'utilisateur connecté
        const response = await api.get('/user');
        setBalance(response.data.wallet_balance || 0);
      } catch (err) {
        console.error("Erreur lors du chargement du portefeuille", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, [user, navigate]);

  if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div></div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gainde-dark">Mon Portefeuille</h1>
        <p className="text-gray-500 mt-2">Gérez votre solde et réglez vos commissions Warr Gaïndé.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARTE DE SOLDE */}
        <div className="bg-gainde-dark text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5"></div>
          <p className="text-gray-300 font-semibold mb-2">Solde Actuel</p>
          <h2 className="text-5xl font-black mb-1">{parseFloat(balance).toLocaleString('fr-FR')} <span className="text-2xl text-gainde-yellow">FCFA</span></h2>
          
          {balance < 0 ? (
            <p className="text-red-400 text-sm mt-4 font-bold">⚠️ Vous devez régler votre découvert pour continuer à publier.</p>
          ) : (
            <p className="text-green-400 text-sm mt-4 font-bold">✅ Votre compte est en règle.</p>
          )}
        </div>

        {/* ACTIONS DE RECHARGE (Design UI) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center space-y-4">
          <h3 className="font-bold text-gray-800 mb-2">Recharger mon compte</h3>
          
          <button className="w-full flex items-center justify-center gap-3 bg-[#1123e4] text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition">
            <span className="text-xl">🌊</span> Recharger via Wave
          </button>
          
          <button className="w-full flex items-center justify-center gap-3 bg-[#ff6600] text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition">
            <span className="text-xl">🟧</span> Recharger via Orange Money
          </button>
        </div>

      </div>
    </div>
  );
}

export default Portefeuille;