import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MapTracking from '../components/MapTracking';
import { getUser } from '../utils/auth';
import { toast } from '../utils/toast';
import { useConfirm } from '../context/ConfirmDialogContext.jsx';

function MesReservations() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [user] = useState(() => getUser());

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Modale évaluation
  const [showReviewModal, setShowReviewModal]   = useState(false);
  const [reviewTrajetId, setReviewTrajetId]     = useState(null);
  const [reviewData, setReviewData]             = useState({ note: 5, commentaire: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!user || user.role_actuel !== 'PASSAGER') { navigate('/'); return; }

    const fetchReservations = async () => {
      try {
        const res = await api.get('/mes-reservations');
        setReservations(res.data.data || []);
      } catch {
        setError('Erreur lors du chargement des réservations.');
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, [user, navigate]);

  // ── Annuler une réservation ───────────────────────────────────────────────
  const handleAnnuler = async (id) => {
    const ok = await confirm({
      title: 'Annuler la réservation',
      message: 'Confirmer l\'annulation de cette réservation ?',
      confirmLabel: 'Annuler la réservation',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api.post(`/reservations/${id}/annuler`);
      if (res.data.success) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, statut: 'ANNULEE' } : r));
        toast.success('Réservation annulée.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'annulation.');
    }
  };

  // ── Envoyer un avis ───────────────────────────────────────────────────────
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await api.post(`/trajets/${reviewTrajetId}/evaluations`, reviewData);
      if (res.data.success) {
        toast.success(res.data.message || 'Merci pour votre avis !');
        setShowReviewModal(false);
        setReviewData({ note: 5, commentaire: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Couleurs statut ───────────────────────────────────────────────────────
  const statutConfig = {
    EN_ATTENTE: { label: 'En attente',  bg: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    ACCEPTEE:   { label: 'Acceptée',    bg: 'bg-green-100 text-green-700',   icon: '✅' },
    REFUSEE:    { label: 'Refusée',     bg: 'bg-red-100 text-red-600',       icon: '❌' },
    ANNULEE:    { label: 'Annulée',     bg: 'bg-gray-100 text-gray-500',     icon: '↩️' },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent"/>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gainde-dark">Mes Réservations</h1>
          <p className="text-gray-500 mt-1">Suivez l'état de vos demandes et vos trajets.</p>
        </div>
        <button
          onClick={() => navigate('/recherche')}
          className="bg-gainde-yellow text-gainde-dark px-6 py-3 rounded-2xl font-bold hover:bg-yellow-500 transition shadow-md flex items-center gap-2"
        >
          🔍 Trouver un trajet
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium mb-6">{error}</div>}

      {/* VIDE */}
      {reservations.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">🎫</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune réservation</h3>
          <p className="text-gray-500 mb-6">Vous n'avez pas encore réservé de trajet. Trouvez votre prochain voyage !</p>
          <button onClick={() => navigate('/recherche')}
            className="bg-gainde-yellow text-gainde-dark px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition">
            Rechercher un trajet
          </button>
        </div>
      )}

      {/* LISTE */}
      {reservations.length > 0 && (
        <div className="grid gap-4">
          {reservations.map((res) => {
            const config = statutConfig[res.statut] || { label: res.statut, bg: 'bg-gray-100 text-gray-600', icon: '📌' };
            const trajet = res.trajet;
            const isActive = res.statut === 'ACCEPTEE' && trajet?.statut === 'EN_ATTENTE';
            const isEnCours = res.statut === 'ACCEPTEE' && trajet?.statut === 'EN_COURS';
            const isTermine = trajet?.statut === 'TERMINE' && res.statut === 'ACCEPTEE';

            return (
              <div key={res.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                res.statut === 'EN_ATTENTE' ? 'border-yellow-200' :
                res.statut === 'ACCEPTEE'  ? 'border-green-200' : 'border-gray-100'
              }`}>

                {/* BARRE DE STATUT */}
                <div className={`h-1.5 ${
                  res.statut === 'ACCEPTEE' ? 'bg-green-400' :
                  res.statut === 'EN_ATTENTE' ? 'bg-yellow-400' :
                  res.statut === 'REFUSEE' ? 'bg-red-400' : 'bg-gray-200'
                }`}/>

                <div className="p-6">
                  {/* LIGNE 1 : route + statut */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${config.bg}`}>
                        {config.icon} {config.label}
                      </span>
                      <h3 className="font-black text-xl text-gainde-dark mt-2">
                        {trajet?.ville_depart} <span className="text-gray-300">→</span> {trajet?.ville_arrivee}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
                        <span>📅 {trajet?.date_heure_depart ? new Date(trajet.date_heure_depart).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' }) : '—'}</span>
                        <span>🕐 {trajet?.date_heure_depart?.substring(11,16)}</span>
                        {trajet?.conducteur && (
                          <span>👤 {trajet.conducteur.prenom} — ⭐ {parseFloat(trajet.conducteur.note_moyenne || 0).toFixed(1)}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-gainde-dark">
                        {parseInt(res.prix_unitaire_fige || trajet?.prix_par_place || 0).toLocaleString('fr-FR')} <span className="text-base font-medium text-gray-400">FCFA</span>
                      </p>
                      <p className="text-xs text-gray-400">{res.nombre_places} place(s)</p>
                    </div>
                  </div>

                  {/* GPS EN DIRECT */}
                  {isEnCours && (
                    <div className="mt-2 pt-4 border-t border-gray-100">
                      <p className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"/>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"/>
                        </span>
                        Trajet en cours — suivi GPS du chauffeur
                      </p>
                      <MapTracking trajetId={trajet.id} />
                    </div>
                  )}

                  {/* ACTIONS */}
                  {(isActive || res.statut === 'EN_ATTENTE') && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={() => handleAnnuler(res.id)}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition"
                      >
                        Annuler la réservation
                      </button>
                    </div>
                  )}

                  {/* ÉVALUATION */}
                  {isTermine && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => { setReviewTrajetId(trajet.id); setShowReviewModal(true); }}
                        className="bg-gainde-yellow text-gainde-dark px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-yellow-500 transition shadow-sm"
                      >
                        ⭐ Évaluer ce trajet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE ÉVALUATION */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
              ✕
            </button>
            <h2 className="text-xl font-black text-gainde-dark mb-1">Évaluer le trajet</h2>
            <p className="text-gray-500 text-sm mb-6">Votre avis aide la communauté Warr Gaïndé.</p>

            <form onSubmit={handleSubmitReview}>
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-3">Note</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((star) => (
                    <button key={star} type="button"
                      onClick={() => setReviewData({ ...reviewData, note: star })}
                      className={`text-4xl transition-transform hover:scale-110 ${reviewData.note >= star ? 'text-gainde-yellow' : 'text-gray-200'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Commentaire (optionnel)</label>
                <textarea rows="3" placeholder="Comment s'est passé ce trajet ?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none resize-none text-sm"
                  value={reviewData.commentaire}
                  onChange={(e) => setReviewData({ ...reviewData, commentaire: e.target.value })}
                />
              </div>

              <button type="submit" disabled={submittingReview}
                className={`w-full py-3.5 rounded-xl font-bold transition ${
                  submittingReview ? 'bg-gray-300 text-gray-500' : 'bg-gainde-dark text-white hover:bg-black'
                }`}>
                {submittingReview ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MesReservations;
