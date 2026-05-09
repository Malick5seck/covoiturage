import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';

/* ------------------------------------------------------------------ */
/*  Petits composants réutilisables                                    */
/* ------------------------------------------------------------------ */

const Stars = ({ note, size = 20 }) => (
  <div className="flex gap-0.5" aria-label={`Note : ${note} sur 5`}>
    {[1, 2, 3, 4, 5].map(star => (
      <svg
        key={star}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={star <= note ? '#F5A623' : 'none'}
        stroke={star <= note ? '#F5A623' : '#D1D5DB'}
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

const InitialeAvatar = ({ prenom, photo }) => {
  if (photo) {
    return (
      <img
        src={photo}
        alt={prenom}
        className="w-11 h-11 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-gainde-yellow text-gainde-dark flex items-center justify-center font-black text-lg shadow-sm shrink-0">
      {prenom?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  );
};

const NoteDistrib = ({ evaluations }) => {
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: evaluations.filter(e => e.note === star).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="flex flex-col gap-1.5">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2 text-sm">
          <span className="w-4 text-right text-gray-500">{star}</span>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gainde-yellow rounded-full transition-all duration-500"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-5 text-xs text-gray-400">{count}</span>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Composant principal                                                */
/* ------------------------------------------------------------------ */

function EvaluationsRecues() {
  const navigate = useNavigate();
  const [user] = useState(() => getUser());

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtre, setFiltre] = useState('tout');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role_actuel !== 'CHAUFFEUR') { navigate('/'); return; }
    chargerEvaluations(1);
  }, [user]);

  const chargerEvaluations = async (p) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/chauffeurs/${user.id}/evaluations?page=${p}`);
      setEvaluations(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      setError('Impossible de charger les évaluations.');
    } finally {
      setLoading(false);
    }
  };

  const evalsFiltrees = filtre === 'tout'
    ? evaluations
    : evaluations.filter(e => e.note === parseInt(filtre));

  const moyenne = evaluations.length
    ? (evaluations.reduce((s, e) => s + e.note, 0) / evaluations.length).toFixed(1)
    : null;

  const prochainDimanche = () => {
    const d = new Date();
    const jour = d.getDay();
    const diff = jour === 0 ? 7 : 7 - jour;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gainde-dark">Mes évaluations</h1>
          <p className="text-gray-500 mt-1">
            Avis laissés par vos passagers après chaque trajet terminé.
          </p>
        </div>
        <button
          onClick={() => navigate('/mes-trajets')}
          className="bg-gainde-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl transition hover:bg-black flex items-center gap-1.5 shadow-sm"
        >
          Mes trajets
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium mb-6">{error}</div>
      )}

      {/* BLOC RÉCAPITULATIF + RAPPEL DIMANCHE */}
      {evaluations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* Note moyenne */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-2">Note moyenne</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-black text-gainde-dark">{moyenne}</span>
              <span className="text-gray-400">/ 5</span>
            </div>
            <Stars note={Math.round(parseFloat(moyenne))} size={20} />
            <p className="text-sm text-gray-400 mt-3">
              {total} avis reçu{total > 1 ? 's' : ''}
            </p>
          </div>

          {/* Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-4">Répartition des notes</p>
            <NoteDistrib evaluations={evaluations} />
          </div>

          {/* Rappel dimanche */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex flex-col justify-center gap-2">
            <p className="text-sm font-bold text-yellow-800">📅 Résumé hebdomadaire</p>
            <p className="text-sm text-yellow-700 leading-relaxed">
              Chaque dimanche, un récapitulatif de vos nouveaux avis vous est envoyé par notification.
            </p>
            <p className="text-xs text-yellow-600 opacity-75">
              Prochain envoi : dimanche {prochainDimanche()}
            </p>
          </div>
        </div>
      )}

      {/* FILTRES */}
      {evaluations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {['tout', '5', '4', '3', '2', '1'].map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                filtre === f
                  ? 'bg-gainde-yellow text-gainde-dark'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f === 'tout' ? 'Tous' : `${f} ★`}
              {f !== 'tout' && (
                <span className="ml-1 opacity-60">
                  ({evaluations.filter(e => e.note === parseInt(f)).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ÉTAT VIDE */}
      {evaluations.length === 0 && !loading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">⭐</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune évaluation reçue</h3>
          <p className="text-gray-500">Les passagers peuvent vous évaluer après chaque trajet terminé.</p>
        </div>
      )}

      {/* RÉSULTAT FILTRE VIDE */}
      {evaluations.length > 0 && evalsFiltrees.length === 0 && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500 text-sm">
          Aucun avis avec la note {filtre} ★.
        </div>
      )}

      {/* LISTE DES ÉVALUATIONS */}
      {evalsFiltrees.length > 0 && (
        <div className="grid gap-4">
          {evalsFiltrees.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Barre colorée selon la note */}
              <div className={`h-1.5 ${
                ev.note >= 4 ? 'bg-green-400' :
                ev.note >= 3 ? 'bg-yellow-400' : 'bg-red-400'
              }`} />

              <div className="p-6">
                <div className="flex items-start gap-4 mb-3">
                  <InitialeAvatar prenom={ev.passager?.prenom} photo={ev.passager?.photo_profil} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-bold text-gainde-dark">
                        {ev.passager?.prenom} {ev.passager?.nom}
                      </h3>
                      <Stars note={ev.note} />
                    </div>

                    {ev.commentaire ? (
                      <p className="text-gray-600 text-sm bg-gray-50 rounded-xl p-4 mt-3 italic">
                        “{ev.commentaire}”
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm mt-2 italic">Pas de commentaire.</p>
                    )}

                    <p className="text-xs text-gray-400 mt-3">
                      {ev.created_at
                        ? new Date(ev.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {total > 10 && (
        <div className="flex justify-center gap-3 mt-8">
          <button
            onClick={() => chargerEvaluations(page - 1)}
            disabled={page <= 1}
            className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40 transition"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2.5 rounded-xl bg-gainde-yellow text-gainde-dark font-bold text-sm">
            Page {page} · {total} avis
          </span>
          <button
            onClick={() => chargerEvaluations(page + 1)}
            disabled={page * 10 >= total}
            className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-40 transition"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

export default EvaluationsRecues;