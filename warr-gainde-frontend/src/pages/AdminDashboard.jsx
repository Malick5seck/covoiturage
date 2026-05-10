import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';
import { toast } from '../utils/toast';
import { useConfirm } from '../context/ConfirmDialogContext.jsx';

/* ═══════════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS
═══════════════════════════════════════════════════════════════════ */

function SectionRecap({ stats }) {
  const trajetsTotaux = (stats?.trajets_en_cours ?? 0) + (stats?.trajets_termines ?? 0);
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

// ─── SECTION PASSAGERS (modifiée : recherche, pagination, suspension avec motif) ───
function SectionPassagers({ isSuperAdmin }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState(null);
  const [motifSuspension, setMotifSuspension] = useState('');
  const [dureeSuspension, setDureeSuspension] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const perPage = 20;

  const charger = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { page: p, role: 'PASSAGER', search: search || undefined },
      });
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      toast.error('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { charger(1); }, [charger]);

  const totalPages = Math.ceil(total / perPage);

  const handleSearch = (e) => {
    e.preventDefault();
    charger(1);
  };

  const openSuspend = (id) => {
    setSuspendUserId(id);
    setMotifSuspension('');
    setDureeSuspension(7);
    setShowSuspendModal(true);
  };

  const confirmSuspend = async () => {
    if (!motifSuspension.trim() || motifSuspension.trim().length < 3) {
      toast.error('Motif requis (min. 3 caractères).');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/users/${suspendUserId}/suspendre`, {
        motif: motifSuspension.trim(),
        duree: dureeSuspension,
      });
      toast.success('Utilisateur suspendu.');
      setUsers(prev => prev.map(u => u.id === suspendUserId ? { ...u, statut_verification: 'SUSPENDU' } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally {
      setSubmitting(false);
      setShowSuspendModal(false);
      setSuspendUserId(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-black text-gainde-dark mb-1">Gestion des passagers</h2>
      <p className="text-gray-500 text-sm mb-6">{total} passager(s) inscrit(s).</p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input type="text" placeholder="Rechercher par nom, téléphone, email..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
        <button type="submit" className="bg-gainde-yellow text-gainde-dark px-5 py-3 rounded-xl font-bold text-sm hover:bg-yellow-500 transition">🔍 Filtrer</button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-gainde-yellow border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon="👤" text="Aucun passager trouvé." />
      ) : (
        <>
          <UsersTable users={users} showStatut={false} actionLabel="Suspendre" onAction={openSuspend} />
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={charger} />}
        </>
      )}

      {/* Modale suspension passager */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => { setShowSuspendModal(false); setSuspendUserId(null); }} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600">✕</button>
            <h3 className="text-xl font-black text-gainde-dark mb-4">Suspendre le compte</h3>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">Motif <span className="text-red-500">*</span></label>
              <textarea rows="3" required placeholder="Raison de la suspension..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none resize-none text-sm"
                value={motifSuspension} onChange={(e) => setMotifSuspension(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Minimum 3 caractères</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-1">Durée (jours) <span className="text-red-500">*</span></label>
              <select value={dureeSuspension} onChange={(e) => setDureeSuspension(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none bg-white text-sm">
                {[1, 3, 7, 14, 30, 90, 365].map(d => <option key={d} value={d}>{d} jour{d > 1 ? 's' : ''}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowSuspendModal(false); setSuspendUserId(null); }} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Annuler</button>
              <button onClick={confirmSuspend} disabled={submitting} className={`flex-1 py-3 rounded-xl font-bold text-white transition ${submitting ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}>
                {submitting ? 'Envoi...' : 'Confirmer la suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION CONDUCTEURS (modifiée : sans bouton Bannir, validation avec disparition, refus avec motif) ───
function SectionConducteurs({ isSuperAdmin }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [refusChauffeurId, setRefusChauffeurId] = useState(null);
  const [motifRefus, setMotifRefus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const perPage = 20;

  const charger = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { page: p, role: 'CHAUFFEUR', search: search || undefined },
      });
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      toast.error('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { charger(1); }, [charger]);

  const totalPages = Math.ceil(total / perPage);

  const handleSearch = (e) => { e.preventDefault(); charger(1); };

  const changeStatut = async (id, nouveauStatut, motif = null, duree = null) => {
    try {
      const payload = { nouveau_statut: nouveauStatut };
      if (motif) payload.motif = motif;
      if (duree) payload.duree = duree;
      await api.post(`/admin/chauffeurs/${id}/statut`, payload);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, statut_verification: nouveauStatut } : u));
      toast.success('Statut mis à jour.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const openRefus = (id) => { setRefusChauffeurId(id); setMotifRefus(''); setShowRefusModal(true); };

  const confirmRefus = async () => {
    if (!motifRefus.trim() || motifRefus.trim().length < 3) { toast.error('Motif requis (min. 3 caractères).'); return; }
    setSubmitting(true);
    await changeStatut(refusChauffeurId, 'REFUSE', motifRefus.trim());
    setSubmitting(false);
    setShowRefusModal(false);
    setRefusChauffeurId(null);
  };

  const statutColors = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700', VALIDE: 'bg-green-100 text-green-700',
    REFUSE: 'bg-red-100 text-red-600', SUSPENDU: 'bg-orange-100 text-orange-700',
  };

  return (
    <div>
      <h2 className="text-xl font-black text-gainde-dark mb-1">Gestion des conducteurs</h2>
      <p className="text-gray-500 text-sm mb-6">{total} conducteur(s) inscrit(s).</p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input type="text" placeholder="Rechercher par nom, téléphone, email..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
        <button type="submit" className="bg-gainde-yellow text-gainde-dark px-5 py-3 rounded-xl font-bold text-sm hover:bg-yellow-500 transition">🔍 Filtrer</button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-gainde-yellow border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon="🚗" text="Aucun conducteur trouvé." />
      ) : (
        <>
          <div className="grid gap-4">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gainde-dark text-white rounded-full flex items-center justify-center font-black text-lg">{u.prenom?.charAt(0)}</div>
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

                  {u.statut_verification === 'EN_ATTENTE' && (
                    <>
                      <button onClick={() => changeStatut(u.id, 'VALIDE')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-200 transition">✅ Valider</button>
                      <button onClick={() => openRefus(u.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition">❌ Refuser</button>
                      <button onClick={() => changeStatut(u.id, 'SUSPENDU')} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-200 transition">⏸ Suspendre</button>
                    </>
                  )}

                  {u.statut_verification === 'VALIDE' && (
                    <button onClick={() => changeStatut(u.id, 'SUSPENDU')} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-200 transition">⏸ Suspendre</button>
                  )}

                  {(u.statut_verification === 'REFUSE' || u.statut_verification === 'SUSPENDU') && (
                    <button onClick={() => changeStatut(u.id, 'VALIDE')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-200 transition">✅ Valider</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={charger} />}
        </>
      )}

      {/* Modale motif de refus conducteur */}
      {showRefusModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => { setShowRefusModal(false); setRefusChauffeurId(null); }} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600">✕</button>
            <h3 className="text-xl font-black text-gainde-dark mb-4">Motif du refus</h3>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Motif <span className="text-red-500">*</span></label>
              <textarea rows="3" required placeholder="Raison du refus..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none resize-none text-sm"
                value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Minimum 3 caractères</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowRefusModal(false); setRefusChauffeurId(null); }} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Annuler</button>
              <button onClick={confirmRefus} disabled={submitting} className={`flex-1 py-3 rounded-xl font-bold text-white transition ${submitting ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}>
                {submitting ? 'Envoi...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION MODÉRATEURS (inchangée) ──────────────────────────────────────
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
          <UsersTable users={mods} onBan={isSuperAdmin ? onBan : null} showStatut={false} roleLabel="MODÉRATEUR" />
        )}
      </div>
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gainde-dark mb-4">➕ Créer un modérateur</h3>
          {msg.text && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required placeholder="Prénom" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required placeholder="Nom" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required type="tel" placeholder="Téléphone" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
            <input required type="password" placeholder="Mot de passe provisoire" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm sm:col-span-2" />
            <button type="submit" disabled={loading} className={`sm:col-span-2 py-3 rounded-xl font-bold text-sm transition ${loading ? 'bg-gray-300 text-gray-500' : 'bg-gainde-dark text-white hover:bg-black shadow-md'}`}>{loading ? 'Création…' : 'Créer le compte modérateur'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── SECTION FINANCES (inchangée) ─────────────────────────────────────────
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
        <div className="bg-gainde-yellow/10 border border-yellow-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
          <span className="text-4xl">💰</span>
          <div>
            <p className="text-sm font-bold text-gray-600">Taux en vigueur</p>
            <p className="text-4xl font-black text-gainde-dark">{stats?.taux_commission_actuel ?? '—'} <span className="text-xl text-gray-400">%</span></p>
          </div>
        </div>
        {!isSuperAdmin ? (
          <div className="bg-gray-50 rounded-2xl p-5 text-center text-gray-400 font-medium text-sm border border-gray-200">🔒 Seul le Super Administrateur peut modifier le taux de commission.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gainde-dark mb-4">Modifier le taux</h3>
            {msg.text && <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>}
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nouveau taux (%)</label>
                <input type="number" min="0" max="100" step="0.5" required placeholder="Ex : 5" value={taux} onChange={e => setTaux(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-lg font-bold" />
              </div>
              <button type="submit" disabled={loading} className={`px-6 py-3 rounded-xl font-bold transition ${loading ? 'bg-gray-300 text-gray-500' : 'bg-gainde-dark text-white hover:bg-black shadow-md'}`}>{loading ? '…' : 'Appliquer'}</button>
            </form>
            <p className="text-xs text-gray-400 mt-3">⚠️ Ce taux sera figé sur tous les nouveaux trajets publiés après la modification.</p>
          </div>
        )}
      </div>
      {isSuperAdmin ? (
        <div>
          <h3 className="text-lg font-black text-gainde-dark mb-4">Revenus de la plateforme</h3>
          <div className="rounded-2xl p-6 border shadow-sm bg-gainde-dark text-white border-gainde-dark mb-6">
            <p className="text-3xl mb-2">💵</p>
            <p className="text-3xl font-black text-gainde-yellow">{totalCommissions.toLocaleString('fr-FR')} <span className="text-xl text-gray-300 font-bold">FCFA</span></p>
            <p className="text-sm font-semibold mt-1 text-gray-300">Total commissions perçues</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-700 font-medium">ℹ️ Les revenus correspondent à la somme de toutes les commissions de type <strong>PRELEVEMENT</strong> avec statut <strong>REUSSI</strong>.</div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500 font-medium text-sm border border-gray-200">🔒 Le détail des revenus (montants) est réservé au Super Administrateur.</div>
      )}
    </div>
  );
}

/* ─── SECTION AUDIT (modifiée : sans IP, sans suspension, recherche, pagination, détails lisibles) ─── */
function SectionAuditLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [filtre, setFiltre]   = useState('');
  const [search, setSearch]   = useState('');
  const perPage = 20;

  const actionLabels = {
    BAN_USER:              '🔨 Bannissement',
    CHANGE_DRIVER_STATUS:  '🔄 Statut chauffeur',
    UPDATE_COMMISSION:     '💰 Taux commission',
    CREATE_MODERATEUR:     '👮 Création modérateur',
    VIEW_STATS:            '📊 Stats consultées',
    VIEW_USERS:            '👥 Liste utilisateurs',
  };

  const charger = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { page: p, action: filtre || undefined, search: search || undefined },
      });
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, [filtre, search]);

  useEffect(() => { charger(1); }, [charger]);

  const totalPages = Math.ceil(total / perPage);

  // On exclut les logs de type SUSPEND_USER
  const filteredLogs = logs.filter(log => log.action !== 'SUSPEND_USER');

  return (
    <div>
      <h2 className="text-xl font-black text-gainde-dark mb-1">📜 Journal d'audit</h2>
      <p className="text-gray-500 text-sm mb-6">Historique des actions des administrateurs et modérateurs.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setFiltre(''); charger(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${!filtre ? 'bg-gainde-yellow text-gainde-dark' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Toutes
        </button>
        {Object.keys(actionLabels).map(k => (
          <button key={k} onClick={() => { setFiltre(k); charger(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${filtre === k ? 'bg-gainde-yellow text-gainde-dark' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {actionLabels[k]}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <input type="text" placeholder="Rechercher par administrateur, action..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none text-sm" />
        <button onClick={() => charger(1)} className="bg-gainde-yellow text-gainde-dark px-5 py-3 rounded-xl font-bold text-sm hover:bg-yellow-500 transition">🔍 Rechercher</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-gainde-yellow border-t-transparent" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState icon="📜" text="Aucune action enregistrée." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold sticky top-0">
                <tr>
                  <th className="px-5 py-4">Admin</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Cible</th>
                  <th className="px-5 py-4">Détails</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-bold text-gainde-dark whitespace-nowrap">
                      {log.admin?.prenom} {log.admin?.nom}
                      <div className="text-xs text-gray-400 font-normal">
                        {log.admin?.niveau_accreditation === 'SUPER_ADMIN' ? 'Super Admin' : 'Modérateur'}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-700 text-sm font-medium">
                      {log.target_type && log.target_id ? `${log.target_type} #${log.target_id}` : '—'}
                      {log.details?.nom ? ` (${log.details.nom})` : ''}
                      {log.details?.chauffeur ? ` (${log.details.chauffeur})` : ''}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 max-w-[250px]">
                      {log.details ? (
                        <div className="space-y-1">
                          {log.details.ancien_statut && log.details.nouveau_statut && (
                            <span>Statut : {log.details.ancien_statut} → {log.details.nouveau_statut}</span>
                          )}
                          {log.details.motif_refus && <span className="block text-red-600">Motif : {log.details.motif_refus}</span>}
                          {log.details.motif && <span className="block">Motif : {log.details.motif}</span>}
                          {log.details.duree_jours && <span className="block">Durée : {log.details.duree_jours} j</span>}
                          {log.details.ancien_taux && log.details.nouveau_taux && <span>Taux : {log.details.ancien_taux}% → {log.details.nouveau_taux}%</span>}
                          {log.details.moderateur && <span>Modérateur : {log.details.moderateur}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => charger(page - 1)} disabled={page <= 1}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40 transition">
            ←
          </button>
          <span className="px-4 py-2 rounded-xl bg-gainde-yellow text-gainde-dark font-bold">{page} / {totalPages}</span>
          <button onClick={() => charger(page + 1)} disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40 transition">
            →
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITAIRES PARTAGÉS
═══════════════════════════════════════════════════════════════════ */

function UsersTable({ users, showStatut = true, actionLabel, onAction, roleLabel = null }) {
  if (users.length === 0) return <EmptyState icon="👤" text="Aucun utilisateur." />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
            <tr>
              <th className="px-5 py-4">Nom</th>
              <th className="px-5 py-4">Téléphone</th>
              <th className="px-5 py-4">Email</th>
              {showStatut && <th className="px-5 py-4">Statut</th>}
              {onAction && <th className="px-5 py-4 text-center">Action</th>}
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
                    }`}>{u.statut_verification || '—'}</span>
                  </td>
                )}
                {onAction && (
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => onAction(u.id)} className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-100 transition">
                      {actionLabel}
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

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="flex justify-center gap-2 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40 transition">←</button>
      <span className="px-4 py-2 rounded-xl bg-gainde-yellow text-gainde-dark font-bold">{page} / {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40 transition">→</button>
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

  // ── Actions globales (utilisées uniquement par Moderateurs et Finances) ──
  const handleBan = async (id) => {
    const ok = await confirm({ title: 'Bannir l’utilisateur', message: 'Bannir définitivement cet utilisateur ?', confirmLabel: 'Bannir', danger: true });
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

  // ── Onglets dynamiques ───────────────────────────────────────────────────
  const tabs = [
    { id: 'dashboard',   label: '📊 Tableau de bord' },
    { id: 'passagers',   label: '🎒 Passagers'       },
    { id: 'conducteurs', label: '🚗 Conducteurs'     },
    { id: 'moderateurs', label: '👮 Modérateurs'     },
    ...(isSuperAdmin
      ? [
          { id: 'finances', label: '💰 Commission & revenus' },
          { id: 'audit',    label: '📜 Journal d\'audit'     },
        ]
      : []),
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent"/>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="bg-gainde-dark text-white rounded-3xl p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black">Administration Warr Gaïndé</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isSuperAdmin ? '👑 Super Administrateur' : '🛡️ Modérateur'} — {user?.prenom} {user?.nom}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="bg-white/10 px-3 py-1.5 rounded-xl font-bold">{usersList.length} utilisateurs</span>
          <span className="bg-gainde-yellow/20 text-gainde-yellow px-3 py-1.5 rounded-xl font-bold">Commission : {stats?.taux_commission_actuel ?? '—'} %</span>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
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

      <div className="min-h-[400px]">
        {onglet === 'dashboard'   && <SectionRecap stats={stats} />}
        {onglet === 'passagers'   && <SectionPassagers isSuperAdmin={isSuperAdmin} />}
        {onglet === 'conducteurs' && <SectionConducteurs isSuperAdmin={isSuperAdmin} />}
        {onglet === 'moderateurs' && <SectionModerateurs users={usersList} onBan={handleBan} isSuperAdmin={isSuperAdmin} />}
        {onglet === 'finances'    && isSuperAdmin && <SectionFinances stats={stats} isSuperAdmin={isSuperAdmin} />}
        {onglet === 'audit'       && isSuperAdmin && <SectionAuditLogs />}
      </div>
    </div>
  );
}

export default AdminDashboard;