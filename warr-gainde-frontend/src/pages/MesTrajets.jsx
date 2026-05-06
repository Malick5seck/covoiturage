import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MapTracking from '../components/MapTracking';
import { getUser } from '../utils/auth';
import { toast } from '../utils/toast';
import { useConfirm } from '../context/ConfirmDialogContext.jsx';

function MesTrajets() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [user] = useState(() => getUser());

  const [trajets, setTrajets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [watchId, setWatchId]   = useState(null);

  // Modale passagers
  const [showModal, setShowModal]                     = useState(false);
  const [selectedPassagers, setSelectedPassagers]     = useState([]);
  const [loadingPassagers, setLoadingPassagers]       = useState(false);

  useEffect(() => {
    if (!user || user.role_actuel !== 'CHAUFFEUR') {
      navigate('/');
      return;
    }
    const fetchTrajets = async () => {
      try {
        const res = await api.get('/mes-trajets');
        setTrajets(res.data.data || []);
      } catch {
        setError('Erreur lors du chargement des trajets.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrajets();
  }, [user, navigate]);

  useEffect(() => () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); }, [watchId]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSeePassengers = async (trajetId) => {
    setLoadingPassagers(true);
    setShowModal(true);
    try {
      const res = await api.get(`/trajets/${trajetId}/passagers`);
      setSelectedPassagers(res.data.data || []);
    } catch {
      toast.error('Impossible de charger la liste des passagers.');
      setShowModal(false);
    } finally {
      setLoadingPassagers(false);
    }
  };

  const trackLocation = (trajetId) => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await api.post(`/trajets/${trajetId}/gps`, {
            latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          });
        } catch {}
      },
      (err) => console.error('GPS', err),
      { enableHighAccuracy: true }
    );
    setWatchId(id);
  };

  const handleStatusChange = async (trajetId, action) => {
    if (action === 'terminer') {
      const ok = await confirm({
        title: 'Arrivée à destination',
        message: 'Confirmez-vous l\'arrivée à destination ? La commission sera prélevée.',
        confirmLabel: 'Terminer le trajet',
      });
      if (!ok) return;
    }
    try {
      const res = await api.post(`/trajets/${trajetId}/${action}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Mise à jour effectuée.');
        if (action === 'demarrer') trackLocation(trajetId);
        else if (action === 'terminer' && watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
        setTrajets(prev => prev.map(t => t.id === trajetId ? { ...t, statut: res.data.statut } : t));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleManualPassenger = async (trajetId, action) => {
    const endpoint = action === 'add' ? 'passager-manuel' : 'place-liberee';
    try {
      const res = await api.post(`/trajets/${trajetId}/${endpoint}`, { nombre_places: 1 });
      if (res.data.success) {
        setTrajets(prev => prev.map(t => t.id === trajetId ? { ...t, places_disponibles: res.data.places_restantes } : t));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.');
    }
  };

  const handleAnnuler = async (trajetId) => {
    const ok = await confirm({
      title: 'Annuler le trajet',
      message: 'Annuler définitivement ce trajet ? Tous les passagers seront notifiés.',
      confirmLabel: 'Annuler le trajet',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api.post(`/trajets/${trajetId}/annuler`);
      if (res.data.success) {
        setTrajets(prev => prev.map(t => t.id === trajetId ? { ...t, statut: 'ANNULE' } : t));
        toast.success('Trajet annulé.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'annulation.');
    }
  };

  // ── Statut badge ──────────────────────────────────────────────────────────

  const statutBadge = (s) => ({
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
    EN_COURS:   'bg-blue-100 text-blue-700',
    TERMINE:    'bg-green-100 text-green-700',
    ANNULE:     'bg-red-100 text-red-600',
  }[s] || 'bg-gray-100 text-gray-600');

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent"/>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gainde-dark">Mes Trajets</h1>
          <p className="text-gray-500 mt-1">Gérez vos trajets publiés et vos passagers.</p>
        </div>
        <button
          onClick={() => navigate('/publier')}
          className="bg-gainde-dark text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition shadow-md flex items-center gap-2"
        >
          ➕ Publier un trajet
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium mb-6">{error}</div>}

      {/* LIENS RAPIDES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate('/demandes-recues')}
          className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 p-5 rounded-2xl hover:bg-yellow-100 transition text-left"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-black text-gainde-dark">Demandes reçues</p>
            <p className="text-sm text-gray-500">Gérer les réservations en attente</p>
          </div>
          <span className="ml-auto text-yellow-500">→</span>
        </button>
        <button
          onClick={() => navigate('/mon-vehicule')}
          className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-5 rounded-2xl hover:bg-gray-100 transition text-left"
        >
          <span className="text-2xl">🚗</span>
          <div>
            <p className="font-black text-gainde-dark">Mon véhicule</p>
            <p className="text-sm text-gray-500">Gérer votre flotte</p>
          </div>
          <span className="ml-auto text-gray-400">→</span>
        </button>
      </div>

      {/* LISTE VIDE */}
      {trajets.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">🛣️</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Aucun trajet publié</h3>
          <p className="text-gray-500 mb-6">Commencez par publier votre premier trajet pour trouver des passagers.</p>
          <button
            onClick={() => navigate('/publier')}
            className="bg-gainde-yellow text-gainde-dark px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition"
          >
            Publier maintenant
          </button>
        </div>
      )}

      {/* LISTE DES TRAJETS */}
      {trajets.length > 0 && (
        <div className="grid gap-4">
          {trajets.map((trajet) => (
            <div key={trajet.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* BANDE STATUT */}
              <div className={`h-1.5 w-full ${
                trajet.statut === 'EN_COURS' ? 'bg-blue-400' :
                trajet.statut === 'TERMINE' ? 'bg-green-400' :
                trajet.statut === 'ANNULE' ? 'bg-red-400' : 'bg-yellow-400'
              }`}/>

              <div className="p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">

                {/* INFOS */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statutBadge(trajet.statut)}`}>
                      {trajet.statut.replace('_', ' ')}
                    </span>
                    <span className="text-gray-300 text-xs">#{trajet.id}</span>
                    {watchId !== null && trajet.statut === 'EN_COURS' && (
                      <span className="text-xs text-blue-600 font-bold animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping inline-block"/>
                        GPS Actif
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-xl text-gainde-dark">
                    {trajet.ville_depart} <span className="text-gray-300">→</span> {trajet.ville_arrivee}
                  </h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <span>📅 {new Date(trajet.date_heure_depart).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</span>
                    <span>🕐 {trajet.date_heure_depart?.substring(11,16)}</span>
                    <span>💰 {parseInt(trajet.prix_par_place).toLocaleString('fr-FR')} FCFA / place</span>
                  </div>
                </div>

                {/* COMPTEUR PLACES + ACTIONS */}
                <div className="flex flex-wrap items-center gap-3">

                  {/* Compteur places manuelle */}
                  {(trajet.statut === 'EN_ATTENTE' || trajet.statut === 'EN_COURS') && (
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                      <button onClick={() => handleManualPassenger(trajet.id, 'remove')}
                        disabled={trajet.places_disponibles >= trajet.nombre_places_totales}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-red-400 hover:text-red-600 disabled:opacity-30 font-bold shadow-sm">
                        −
                      </button>
                      <span className="font-black text-gainde-dark w-14 text-center">
                        {trajet.nombre_places_totales - trajet.places_disponibles}/{trajet.nombre_places_totales}
                      </span>
                      <button onClick={() => handleManualPassenger(trajet.id, 'add')}
                        disabled={trajet.places_disponibles === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-green-500 hover:text-green-700 disabled:opacity-30 font-bold shadow-sm">
                        +
                      </button>
                    </div>
                  )}

                  {/* Bouton passagers */}
                  <button onClick={() => handleSeePassengers(trajet.id)}
                    className="bg-gray-100 text-gainde-dark px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition text-sm flex items-center gap-1.5">
                    👥 Passagers
                  </button>

                  {/* Actions statut */}
                  {trajet.statut === 'EN_ATTENTE' && (
                    <>
                      <button onClick={() => handleStatusChange(trajet.id, 'demarrer')}
                        className="bg-gainde-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition text-sm shadow-md">
                        🚀 Démarrer
                      </button>
                      <button onClick={() => handleAnnuler(trajet.id)}
                        className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-bold hover:bg-red-100 transition text-sm">
                        Annuler
                      </button>
                    </>
                  )}

                  {trajet.statut === 'EN_COURS' && (
                    <button onClick={() => handleStatusChange(trajet.id, 'terminer')}
                      className="bg-gainde-yellow text-gainde-dark px-5 py-2.5 rounded-xl font-bold hover:bg-yellow-500 transition text-sm shadow-md">
                      🏁 Terminer
                    </button>
                  )}

                  {trajet.statut === 'TERMINE' && (
                    <span className="bg-green-100 text-green-700 px-4 py-2.5 rounded-xl font-bold text-sm">✅ Terminé</span>
                  )}
                </div>
              </div>

              {trajet.statut === 'EN_COURS' && (
                <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-sm font-bold text-blue-600 mb-3 pt-4 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                    </span>
                    Trajet en cours — suivi GPS (partagé avec les passagers)
                  </p>
                  <MapTracking trajetId={trajet.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODALE PASSAGERS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative max-h-[80vh] flex flex-col">
            <button onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition">
              ✕
            </button>
            <h2 className="text-xl font-black text-gainde-dark mb-5">Passagers du trajet</h2>

            {loadingPassagers ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin h-8 w-8 rounded-full border-3 border-gainde-yellow border-t-transparent"/>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1">
                {selectedPassagers.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Aucun passager accepté pour l'instant.</p>
                ) : (
                  selectedPassagers.map((res) => (
                    <div key={res.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gainde-dark text-white rounded-full flex items-center justify-center font-bold">
                          {res.passager?.prenom?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gainde-dark">{res.passager?.prenom} {res.passager?.nom}</p>
                          <div className="flex gap-3 mt-0.5">
                            <a href={`tel:${res.passager?.telephone}`} className="text-xs text-gray-500 hover:text-gainde-dark font-medium">📞 Appeler</a>
                            <a href={`https://wa.me/${res.passager?.telephone?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer"
                              className="text-xs text-green-600 hover:text-green-800 font-medium">💬 WhatsApp</a>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">Accepté</span>
                    </div>
                  ))
                )}
              </div>
            )}

            <button onClick={() => setShowModal(false)}
              className="mt-6 w-full bg-gainde-dark text-white py-3 rounded-xl font-bold hover:bg-black transition">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MesTrajets;
