import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';
import { toast } from '../utils/toast';
import { useConfirm } from '../context/ConfirmDialogContext.jsx';
 
/* ═══════════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS — chaque onglet est isolé pour la lisibilité
═══════════════════════════════════════════════════════════════════ */
 
// ── Tableau de bord ───────────────────────────────────────────────────────────
function SectionRecap({ stats }) {
  const trajetsTotaux =
    (stats?.trajets_en_cours ?? 0) + (stats?.trajets_termines ?? 0);

  const cards = [
    { label: 'Utilisateurs inscrits',    value: stats?.total_utilisateurs,    icon: '👥', color: 'bg-blue-50   text-blue-700'   },
    { label: 'Chauffeurs validés',        value: stats?.chauffeurs_valides,     icon: '✅', color: 'bg-green-50  text-green-700'  },
    { label: 'Chauffeurs en attente',     value: stats?.chauffeurs_en_attente,  icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Trajets en cours',          value: stats?.trajets_en_cours,       icon: '🚗', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Trajets totaux',            value: trajetsTotaux,                 icon: '📊', color: 'bg-gray-50   text-gray-700'   },
    { label: 'Revenus plateforme (FCFA)', value: parseInt(stats?.chiffre_affaires_plateforme || 0).toLocaleString('fr-FR'), icon: '💰', color: 'bg-gainde-yellow/10 text-yellow-800' },
  ];
 
  return (
    <div>
      <h2 className="text-xl font-black text-gainde-dark mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-6 ${c.color} border border-white shadow-sm`}>
            <p className="text-3xl mb-1">{c.icon}</p>
            <p className="text-3xl font-black">{c.value ?? '—'}</p>
            <p className="text-sm font-semibold mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>
 
      <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-black text-gainde-dark mb-2">Taux de commission actuel</h3>
        <p className="text-5xl font-black text-gainde-yellow">
          {stats?.taux_commission_actuel ?? '—'}<span className="text-2xl text-gray-400"> %</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">Appliqué à tous les nouveaux trajets publiés.</p>
      </div>
    </div>
  );
}
 
// ── Passagers ────────────────────────────────────────────────────────────────
function SectionPassagers({ users, onBan }) {
  const passagers = users.filter(u => u.role_actuel === 'PASSAGER');
 
  return (
    <div>
      <h2 className="text-xl font-black text-gainde-dark mb-1">Gestion des passagers</h2>
      <p className="text-gray-500 text-sm mb-6">{passagers.length} passager(s) inscrit(s).</p>
      <UsersTable users={passagers} onBan={onBan} showStatut={false} showPermis={false} />
    </div>
  );
}
 
// ── Conducteurs ──────────────────────────────────────────────────────────────
function SectionConducteurs({ users, onBan, onChangeStatut }) {
  const conducteurs = users.filter(u => u.role_actuel === 'CHAUFFEUR');
  const statutColors = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
    VALIDE:     'bg-green-100  text-green-700',
    REFUSE:     'bg-red-100    text-red-600',
    SUSPENDU:   'bg-orange-100 text-orange-700',
  };
 
  return (
    <div>
      <h2 className="text-xl font-black text-gainde-dark mb-1">Gestion des conducteurs</h2>
      <p className="text-gray-500 text-sm mb-6">{conducteurs.length} conducteur(s) inscrit(s).</p>
 
      {conducteurs.length === 0 ? (
        <EmptyState icon="🚗" text="Aucun conducteur inscrit." />
      ) : (
        <div className="grid gap-4">
          {conducteurs.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gainde-dark text-white rounded-full flex items-center justify-center font-black text-lg">
                  {u.prenom?.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-gainde-dark">{u.prenom} {u.nom}</p>
                  <p className="text-sm text-gray-500">{u.telephone}</p>
                  {u.numero_permis && <p className="text-xs text-gray-400 mt-0.5">Permis : {u.numero_permis}</p>}
                </div>
              </div>
 
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statutColors[u.statut_verification] || 'bg-gray-100 text-gray-600'}`}>
                  {u.statut_verification || 'EN_ATTENTE'}
                </span>
                <button onClick={() => onChangeStatut(u.id, 'VALIDE')}
                  className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-200 transition">
                  ✅ Valider
                </button>
                <button onClick={() => onChangeStatut(u.id, 'SUSPENDU')}
                  className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-200 transition">
                  ⏸ Suspendre
                </button>
                <button onClick={() => onChangeStatut(u.id, 'REFUSE')}
                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition">
                  ❌ Refuser
                </button>
                <button onClick={() => onBan(u.id)}
                  className="bg-gray-50 text-gray-500 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-600 transition">
                  🚫 Bannir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
// ── Modérateurs (Super Admin uniquement) ─────────────────────────────────────
function SectionModerateurs({ users, onBan, isSuperAdmin }) {
  const mods = users.filter(u => u.role_actuel === 'ADMIN' && u.niveau_accreditation === 'MODERATEUR');
 
  const [form, setForm]       = useState({ nom:'', prenom:'', telephone:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState({ type:'', text:'' });
 
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type:'', text:'' });
    try {
      await api.post('/admin/moderateurs', form);
      setMsg({ type:'success', text:'Compte modérateur créé avec succès.' });
      setForm({ nom:'', prenom:'', telephone:'', email:'', password:'' });
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.message || 'Erreur lors de la création.' });
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-gainde-dark mb-1">Modérateurs</h2>
        <p className="text-gray-500 text-sm mb-6">{mods.length} modérateur(s) actif(s).</p>
 
        {mods.length === 0 ? (
          <EmptyState icon="👮" text="Aucun modérateur créé." />
        ) : (
          <UsersTable users={mods} onBan={isSuperAdmin ? onBan : null} showStatut={false} showPermis={false} roleLabel="MODÉRATEUR" />
        )}
      </div>
 
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gainde-dark mb-4">➕ Créer un modérateur</h3>
 
          {msg.text && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {msg.text}
            </div>
          )}
 
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required placeholder="Prénom" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required placeholder="Nom" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required type="tel" placeholder="Téléphone" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required type="password" placeholder="Mot de passe provisoire" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm sm:col-span-2" />
            <button type="submit" disabled={loading}
              className={`sm:col-span-2 py-3 rounded-xl font-bold text-sm transition ${loading ? 'bg-gray-300 text-gray-500' : 'bg-gainde-dark text-white hover:bg-black shadow-md'}`}>
              {loading ? 'Création…' : 'Créer le compte modérateur'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
 
// ── Commission & revenus (fusion : sans sous-KPI trajets dans la partie revenus) ─
function SectionFinances({ stats, isSuperAdmin }) {
  const [taux, setTaux]   = useState('');
  const [msg, setMsg]     = useState({ type:'', text:'' });
  const [loading, setLoading] = useState(false);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type:'', text:'' });
    try {
      const res = await api.post('/admin/commission', { taux });
      setMsg({ type:'success', text: res.data.message });
      setTaux('');
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.message || 'Erreur.' });
    } finally {
      setLoading(false);
    }
  };
 
  const totalCommissions = parseInt(stats?.chiffre_affaires_plateforme || 0);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
      <h2 className="text-xl font-black text-gainde-dark mb-1">Commission & revenus</h2>
      <p className="text-gray-500 text-sm mb-6">Taux appliqué aux trajets et commissions perçues par la plateforme.</p>
 
      {/* Taux actuel */}
      <div className="bg-gainde-yellow/10 border border-yellow-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
        <span className="text-4xl">💰</span>
        <div>
          <p className="text-sm font-bold text-gray-600">Taux en vigueur</p>
          <p className="text-4xl font-black text-gainde-dark">
            {stats?.taux_commission_actuel ?? '—'} <span className="text-xl text-gray-400">%</span>
          </p>
        </div>
      </div>
 
      {!isSuperAdmin ? (
        <div className="bg-gray-50 rounded-2xl p-5 text-center text-gray-400 font-medium text-sm border border-gray-200">
          🔒 Seul le Super Administrateur peut modifier le taux de commission.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gainde-dark mb-4">Modifier le taux</h3>
 
          {msg.text && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {msg.text}
            </div>
          )}
 
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nouveau taux (%)</label>
              <input type="number" min="0" max="100" step="0.5" required
                placeholder="Ex : 5" value={taux}
                onChange={e => setTaux(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-lg font-bold" />
            </div>
            <button type="submit" disabled={loading}
              className={`px-6 py-3 rounded-xl font-bold transition ${loading ? 'bg-gray-300 text-gray-500' : 'bg-gainde-dark text-white hover:bg-black shadow-md'}`}>
              {loading ? '…' : 'Appliquer'}
            </button>
          </form>
 
          <p className="text-xs text-gray-400 mt-3">
            ⚠️ Ce taux sera figé sur tous les nouveaux trajets publiés après la modification.
          </p>
        </div>
      )}
      </div>

      {isSuperAdmin ? (
        <div>
          <h3 className="text-lg font-black text-gainde-dark mb-4">Revenus de la plateforme</h3>
          <div className="rounded-2xl p-6 border shadow-sm bg-gainde-dark text-white border-gainde-dark mb-6">
            <p className="text-3xl mb-2">💵</p>
            <p className="text-3xl font-black text-gainde-yellow">
              {totalCommissions.toLocaleString('fr-FR')} <span className="text-xl text-gray-300 font-bold">FCFA</span>
            </p>
            <p className="text-sm font-semibold mt-1 text-gray-300">Total commissions perçues</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-700 font-medium">
            ℹ️ Les revenus correspondent à la somme de toutes les commissions de type <strong>PRELEVEMENT</strong> avec statut <strong>REUSSI</strong>.
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500 font-medium text-sm border border-gray-200">
          🔒 Le détail des revenus (montants) est réservé au Super Administrateur.
        </div>
      )}
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   UTILITAIRES PARTAGÉS
═══════════════════════════════════════════════════════════════════ */
 
function UsersTable({ users, onBan, showStatut = true, showPermis = true, roleLabel = null }) {
  if (users.length === 0) return <EmptyState icon="👤" text="Aucun utilisateur dans cette catégorie." />;
 
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
            <tr>
              <th className="px-5 py-4">Nom</th>
              <th className="px-5 py-4">Téléphone</th>
              <th className="px-5 py-4">Email</th>
              {showStatut  && <th className="px-5 py-4">Statut</th>}
              {onBan       && <th className="px-5 py-4 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-4 font-bold text-gainde-dark whitespace-nowrap">
                  {u.prenom} {u.nom}
                  {roleLabel && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{roleLabel}</span>}
                </td>
                <td className="px-5 py-4 text-gray-500">{u.telephone}</td>
                <td className="px-5 py-4 text-gray-500">{u.email || '—'}</td>
                {showStatut && (
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      u.statut_verification === 'VALIDE'   ? 'bg-green-100  text-green-700'  :
                      u.statut_verification === 'SUSPENDU' ? 'bg-orange-100 text-orange-700' :
                      u.statut_verification === 'REFUSE'   ? 'bg-red-100    text-red-600'    :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {u.statut_verification || '—'}
                    </span>
                  </td>
                )}
                {onBan && (
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => onBan(u.id)}
                      className="bg-red-50 text-red-500 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition">
                      🚫 Bannir
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
function EmptyState({ icon, text }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-400 font-medium">{text}</p>
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
 
const TABS = [
  { id: 'dashboard',   label: '📊 Tableau de bord', all: true  },
  { id: 'passagers',   label: '🎒 Passagers',       all: true  },
  { id: 'conducteurs', label: '🚗 Conducteurs',     all: true  },
  { id: 'moderateurs', label: '👮 Modérateurs',     all: true  },
  { id: 'finances',    label: '💰 Commission & revenus', all: true  },
];
 
function AdminDashboard() {
  const navigate  = useNavigate();
  const confirm   = useConfirm();
  const [user]    = useState(() => getUser());
  const [onglet, setOnglet] = useState('dashboard');
 
  const [stats,     setStats]     = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
 
  const isSuperAdmin = user?.niveau_accreditation === 'SUPER_ADMIN';
 
  useEffect(() => {
    if (!user || user.role_actuel !== 'ADMIN') { navigate('/'); return; }
 
    (async () => {
      setLoading(true);
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users'),
        ]);
        setStats(statsRes.data.data);
        const raw = usersRes.data.data || usersRes.data || [];
        setUsersList(Array.isArray(raw) ? raw : raw.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);
 
  // ── Actions globales ────────────────────────────────────────────────────────
  const handleBan = async (id) => {
    const ok = await confirm({
      title: 'Bannir l’utilisateur',
      message: 'Bannir définitivement cet utilisateur ?',
      confirmLabel: 'Bannir',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsersList(prev => prev.filter(u => u.id !== id));
      toast.success('Utilisateur retiré de la plateforme.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du bannissement.');
    }
  };
 
  const handleChangeStatut = async (id, nouveauStatut) => {
    try {
      await api.post(`/admin/chauffeurs/${id}/statut`, { nouveau_statut: nouveauStatut });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, statut_verification: nouveauStatut } : u));
      toast.success('Statut du chauffeur mis à jour.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };
 
  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent"/>
    </div>
  );
 
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
 
      {/* EN-TÊTE */}
      <div className="bg-gainde-dark text-white rounded-3xl p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black">Administration Warr Gaïndé</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isSuperAdmin ? '👑 Super Administrateur' : '🛡️ Modérateur'} — {user?.prenom} {user?.nom}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="bg-white/10 px-3 py-1.5 rounded-xl font-bold">
            {usersList.length} utilisateurs
          </span>
          <span className="bg-gainde-yellow/20 text-gainde-yellow px-3 py-1.5 rounded-xl font-bold">
            Commission : {stats?.taux_commission_actuel ?? '—'} %
          </span>
        </div>
      </div>
 
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6">{error}</div>}
 
      {/* NAVBAR INTERNE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setOnglet(tab.id)}
              className={`flex-shrink-0 px-5 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
                onglet === tab.id
                  ? 'border-gainde-yellow text-gainde-dark bg-yellow-50'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
 
      {/* CONTENU DE L'ONGLET ACTIF */}
      <div className="min-h-[400px]">
        {onglet === 'dashboard'   && <SectionRecap stats={stats} />}
        {onglet === 'passagers'   && <SectionPassagers users={usersList} onBan={handleBan} />}
        {onglet === 'conducteurs' && <SectionConducteurs users={usersList} onBan={handleBan} onChangeStatut={handleChangeStatut} />}
        {onglet === 'moderateurs' && <SectionModerateurs users={usersList} onBan={handleBan} isSuperAdmin={isSuperAdmin} />}
        {onglet === 'finances'    && <SectionFinances stats={stats} isSuperAdmin={isSuperAdmin} />}
      </div>
    </div>
  );
}
 
export default AdminDashboard;
 