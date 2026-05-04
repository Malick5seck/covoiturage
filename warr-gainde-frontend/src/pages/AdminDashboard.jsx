import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';

function AdminDashboard() {
  const navigate = useNavigate();
  const [user] = useState(() => getUser());

  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [tauxCommission, setTauxCommission] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modData, setModData] = useState({ nom: '', prenom: '', telephone: '', email: '', password: '' });
  const [creatingMod, setCreatingMod] = useState(false);

  useEffect(() => {
    if (!user || user.role_actuel !== 'ADMIN') {
      navigate('/');
      return;
    }

    const fetchAdminData = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users')
        ]);

        // Stats
        setStats(statsRes.data.data);

        // Utilisateurs : s'adapter à la structure paginée
        const usersData = usersRes.data.data || usersRes.data || [];
        setUsersList(Array.isArray(usersData) ? usersData : usersData.data || []);
      } catch (err) {
        // Afficher le vrai code et le message backend
        console.error('Erreur Admin API:', err.response);
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        setError(`Erreur ${status ? status + ' : ' : ''}${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [user, navigate]);

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/commission', { taux: tauxCommission });
      if (res.data.success) {
        alert("✅ " + res.data.message);
        setTauxCommission('');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la mise à jour de la commission.");
    }
  };

  const handleChauffeurStatus = async (id, nouveauStatut) => {
    if (!window.confirm(`Passer ce chauffeur en ${nouveauStatut} ?`)) return;
    try {
      const res = await api.post(`/admin/chauffeurs/${id}/statut`, { nouveau_statut: nouveauStatut });
      if (res.data.success) {
        setUsersList(usersList.map(u => u.id === id ? { ...u, statut_verification: nouveauStatut } : u));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur de modération.");
    }
  };

  const handleBanUser = async (id) => {
    if (!window.confirm("Bannir définitivement cet utilisateur ? (Soft Delete)")) return;
    try {
      const res = await api.delete(`/admin/users/${id}`);
      if (res.data.success) {
        setUsersList(usersList.filter(u => u.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors du bannissement.");
    }
  };

  const handleAddModerator = async (e) => {
    e.preventDefault();
    setCreatingMod(true);
    try {
      const res = await api.post('/admin/moderateurs', modData);
      if (res.data.success) {
        alert("✅ " + res.data.message);
        setUsersList([res.data.data, ...usersList]);
        setModData({ nom: '', prenom: '', telephone: '', email: '', password: '' });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la création du modérateur.");
    } finally {
      setCreatingMod(false);
    }
  };

  if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-center bg-gainde-dark text-white p-8 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-3xl font-black">Administration Warr Gaïndé</h1>
          <p className="text-gray-300 mt-2">
            Espace {user?.niveau_accreditation === 'MODERATEUR' ? 'Modérateur' : 'Super Administrateur'}.
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-8">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 font-bold mb-1">Total Inscrits</p>
            <h3 className="text-4xl font-black text-gainde-dark">{stats?.total_utilisateurs}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 font-bold mb-1">Chauffeurs en attente</p>
            <h3 className="text-4xl font-black text-yellow-600">{stats?.chauffeurs_en_attente}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 font-bold mb-1">Trajets en cours</p>
            <h3 className="text-4xl font-black text-blue-600">{stats?.trajets_en_cours}</h3>
          </div>
          {user?.niveau_accreditation !== 'MODERATEUR' ? (
            <div className="bg-gainde-yellow p-6 rounded-3xl shadow-sm border border-yellow-400">
              <p className="text-gainde-dark font-bold mb-1">Revenus Plateforme</p>
              <h3 className="text-4xl font-black text-gainde-dark">{stats?.chiffre_affaires_plateforme} <span className="text-xl">FCFA</span></h3>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center">
              <p className="text-gray-400 font-bold">Données financières masquées</p>
            </div>
          )}
        </div>

        {user?.niveau_accreditation !== 'MODERATEUR' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gainde-dark mb-4">💰 Taux de Commission</h3>
              <form onSubmit={handleCommissionSubmit}>
                <div className="flex gap-3">
                  <input 
                    type="number" min="0" max="100" required placeholder="Ex: 5"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gainde-yellow"
                    value={tauxCommission}
                    onChange={(e) => setTauxCommission(e.target.value)}
                  />
                  <span className="flex items-center text-xl font-bold text-gray-400">%</span>
                </div>
                <button type="submit" className="w-full mt-4 bg-gainde-dark text-white py-3 rounded-xl font-bold hover:bg-black transition">
                  Mettre à jour
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gainde-dark mb-4">👮 Équipe Modération</h3>
              <form onSubmit={handleAddModerator} className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" required placeholder="Prénom" className="w-1/2 px-3 py-2 rounded-xl border border-gray-200 outline-none text-sm"
                    value={modData.prenom} onChange={(e) => setModData({...modData, prenom: e.target.value})} />
                  <input type="text" required placeholder="Nom" className="w-1/2 px-3 py-2 rounded-xl border border-gray-200 outline-none text-sm"
                    value={modData.nom} onChange={(e) => setModData({...modData, nom: e.target.value})} />
                </div>
                <input type="tel" required placeholder="Téléphone" className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-sm"
                    value={modData.telephone} onChange={(e) => setModData({...modData, telephone: e.target.value})} />
                <input type="email" required placeholder="Email" className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-sm"
                    value={modData.email} onChange={(e) => setModData({...modData, email: e.target.value})} />
                <input type="password" required placeholder="Mot de passe provisoire" className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-sm"
                    value={modData.password} onChange={(e) => setModData({...modData, password: e.target.value})} />
                
                <button type="submit" disabled={creatingMod} className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition text-sm">
                  {creatingMod ? 'Création...' : 'Créer le compte'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gainde-dark">Gestion des Comptes</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
              <tr>
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Statut Chauffeur</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <div className="font-bold text-gainde-dark">{u.prenom} {u.nom}</div>
                    <div className="text-sm text-gray-500">{u.telephone}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      u.role_actuel === 'ADMIN' && u.niveau_accreditation !== 'MODERATEUR' ? 'bg-purple-100 text-purple-700' :
                      u.role_actuel === 'ADMIN' && u.niveau_accreditation === 'MODERATEUR' ? 'bg-blue-100 text-blue-700' :
                      u.role_actuel === 'CHAUFFEUR' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role_actuel === 'ADMIN' && u.niveau_accreditation === 'MODERATEUR' ? 'MODÉRATEUR' : u.role_actuel}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.role_actuel === 'CHAUFFEUR' ? (
                       <span className={`text-xs font-bold ${u.statut_verification === 'VALIDE' ? 'text-green-600' : u.statut_verification === 'SUSPENDU' ? 'text-red-600' : 'text-yellow-600'}`}>
                         {u.statut_verification || 'EN_ATTENTE'}
                       </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4 flex items-center justify-center gap-2">
                    {u.role_actuel === 'CHAUFFEUR' && (
                      <>
                        <button onClick={() => handleChauffeurStatus(u.id, 'VALIDE')} className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold hover:bg-green-200">
                          Valider
                        </button>
                        <button onClick={() => handleChauffeurStatus(u.id, 'SUSPENDU')} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-200">
                          Suspendre
                        </button>
                      </>
                    )}
                    {u.role_actuel !== 'ADMIN' && (
                      <button onClick={() => handleBanUser(u.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-100">
                        Bannir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;