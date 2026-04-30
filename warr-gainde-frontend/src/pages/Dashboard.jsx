import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MapTracking from '../components/MapTracking';

function Dashboard() {
  const navigate = useNavigate();
  
  const [user] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedTrajetPassagers, setSelectedTrajetPassagers] = useState([]);
  const [loadingPassagers, setLoadingPassagers] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTrajetId, setReviewTrajetId] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    return () => {
      if (watchId) clearInterval(watchId);
    };
  }, [watchId]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = user.role_actuel === 'CHAUFFEUR' ? '/mes-trajets' : '/mes-reservations';
        const response = await api.get(endpoint);
        setData(response.data.data || response.data || []);
      } catch (err) {
        console.error("Erreur API:", err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  // CHAUFFEUR : Voir les passagers
  const handleSeePassengers = async (trajetId) => {
    setLoadingPassagers(true);
    setShowModal(true);
    try {
      const response = await api.get(`/trajets/${trajetId}/passagers`);
      setSelectedTrajetPassagers(response.data.data || response.data || []);
    } catch (err) {
      alert("Impossible de charger la liste des passagers.");
      setShowModal(false);
    } finally {
      setLoadingPassagers(false);
    }
  };

  // CHAUFFEUR : Accepter ou Refuser une demande
  const handleReservationAction = async (reservationId, action, trajetId) => {
    try {
      const response = await api.post(`/reservations/${reservationId}/${action}`);
      
      if (response.data.success) {
        if (action === 'refuser') {
          setSelectedTrajetPassagers(selectedTrajetPassagers.filter(r => r.id !== reservationId));
        } else {
          setSelectedTrajetPassagers(selectedTrajetPassagers.map(r => 
            r.id === reservationId ? { ...r, statut: 'ACCEPTEE' } : r
          ));
          setData(data.map(t => {
            if (t.id === trajetId) {
              return { ...t, places_disponibles: response.data.places_restantes };
            }
            return t;
          }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'action.");
    }
  };

  // CHAUFFEUR : Passager manuel sur la route
  const handleManualPassenger = async (trajetId, action) => {
    const endpoint = action === 'add' ? 'passager-manuel' : 'place-liberee';
    try {
      const response = await api.post(`/trajets/${trajetId}/${endpoint}`, { nombre_places: 1 });
      if (response.data.success) {
        setData(data.map(t => {
          if (t.id === trajetId) {
            return { ...t, places_disponibles: response.data.places_restantes };
          }
          return t;
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Action impossible.");
    }
  };

  const trackLocation = (trajetId) => {
    if ("geolocation" in navigator) {
      const id = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await api.post(`/trajets/${trajetId}/gps`, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            } catch (err) {}
          },
          (err) => console.error(err),
          { enableHighAccuracy: true }
        );
      }, 30000);
      setWatchId(id);
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  // CHAUFFEUR : Démarrer ou terminer
  const handleStatusChange = async (trajetId, action) => {
    if (action === 'terminer' && !window.confirm("Êtes-vous sûr d'être arrivé à destination ? La commission sera prélevée.")) {
      return;
    }
    try {
      const response = await api.post(`/trajets/${trajetId}/${action}`);
      if (response.data.success) {
        alert("✅ " + response.data.message);
        if (action === 'demarrer') {
          trackLocation(trajetId);
        } else if (action === 'terminer' && watchId) {
          clearInterval(watchId);
          setWatchId(null);
        }
        setData(data.map(t => {
          if (t.id === trajetId) return { ...t, statut: response.data.statut };
          return t;
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la mise à jour du trajet.");
    }
  };

  // PASSAGER : Envoyer un avis
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const response = await api.post(`/trajets/${reviewTrajetId}/reviews`, reviewData);
      if (response.data.success) {
        alert("🎉 " + response.data.message);
        setShowReviewModal(false);
        setReviewData({ rating: 5, comment: '' });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'envoi de l'avis.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gainde-dark">Tableau de bord</h1>
        <p className="text-gray-500 mt-2">
          Bienvenue {user?.prenom}, voici {user?.role_actuel === 'CHAUFFEUR' ? 'vos trajets publiés' : 'vos réservations'}.
        </p>
      </div>

      {loading && <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gainde-yellow mx-auto"></div></div>}
      {error && <div className="bg-red-50 text-gainde-red p-4 rounded-xl font-medium">{error}</div>}

      {/* ÉTAT VIDE AVEC BOUTONS D'ACTION */}
      {!loading && !error && data.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="text-5xl mb-4">🏜️</div>
          <h3 className="text-xl font-bold text-gray-700">C'est un peu vide par ici</h3>
          <p className="text-gray-500 mt-2 mb-6">Vous n'avez pas encore d'historique pour le moment.</p>
          
          {user?.role_actuel === 'PASSAGER' ? (
            <button 
              onClick={() => navigate('/')} 
              className="bg-gainde-yellow text-gainde-dark px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition shadow-sm"
            >
              🔍 Rechercher mon premier trajet
            </button>
          ) : user?.role_actuel === 'CHAUFFEUR' ? (
            <button 
              onClick={() => navigate('/publier')} 
              className="bg-gainde-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition shadow-sm"
            >
              🚗 Publier un trajet
            </button>
          ) : null}
        </div>
      )}

      {/* VUE PASSAGER */}
      {!loading && user?.role_actuel === 'PASSAGER' && data.length > 0 && (
        <div className="grid gap-6">
          {data.map((res) => (
            <div key={res.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center">
                <div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block ${
                    res.trajet?.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                    res.trajet?.statut === 'TERMINE' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {res.trajet?.statut}
                  </span>
                  <h3 className="font-bold text-xl text-gainde-dark">
                    {res.trajet?.ville_depart} ➔ {res.trajet?.ville_arrivee}
                  </h3>
                  <p className="text-gray-500 text-sm italic mt-1">
                    Par {res.trajet?.conducteur?.prenom} • {res.trajet?.vehicule?.marque_modele}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    📅 {new Date(res.trajet?.date_heure_depart).toLocaleDateString('fr-FR')} à {res.trajet?.date_heure_depart?.substring(11,16)}
                  </p>
                </div>
                
                <div className="text-right flex flex-col items-end mt-4 md:mt-0">
                  <p className="text-xl font-black text-gainde-dark">{res.trajet?.prix_par_place} FCFA</p>
                  {res.trajet?.statut === 'TERMINE' && (
                    <button 
                      onClick={() => {
                        setReviewTrajetId(res.trajet.id);
                        setShowReviewModal(true);
                      }}
                      className="mt-3 bg-gainde-yellow text-gainde-dark px-4 py-2 rounded-xl text-sm font-bold hover:bg-yellow-500 transition shadow-sm"
                    >
                      ⭐ Évaluer le trajet
                    </button>
                  )}
                </div>
              </div>

              {res.trajet?.statut === 'EN_COURS' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    Suivi GPS en direct du chauffeur :
                  </p>
                  <MapTracking trajetId={res.trajet.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VUE CHAUFFEUR */}
      {!loading && user?.role_actuel === 'CHAUFFEUR' && data.length > 0 && (
        <div className="grid gap-6">
          {data.map((trajet) => (
            <div key={trajet.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <span className={`text-white text-xs font-bold px-2 py-1 rounded ${
                     trajet.statut === 'TERMINE' ? 'bg-green-600' : 
                     trajet.statut === 'EN_COURS' ? 'bg-blue-600' : 'bg-gainde-dark'
                   }`}>
                     {trajet.statut}
                   </span>
                   <span className="text-gray-400 text-sm">#{trajet.id}</span>
                </div>
                <h3 className="font-bold text-xl text-gainde-dark">
                  {trajet.ville_depart} ➔ {trajet.ville_arrivee}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  📅 {new Date(trajet.date_heure_depart).toLocaleDateString('fr-FR')} à {trajet.date_heure_depart?.substring(11,16)}
                </p>
                {watchId && trajet.statut === 'EN_COURS' && (
                  <p className="text-xs text-blue-600 font-bold mt-2 animate-pulse">📡 GPS Actif - Position partagée</p>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center mr-2 flex flex-col items-center">
                  <p className="text-sm text-gray-500 font-semibold mb-1">Occupation</p>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                    <button 
                      onClick={() => handleManualPassenger(trajet.id, 'remove')}
                      disabled={trajet.places_disponibles >= trajet.nombre_places_totales}
                      className="w-6 h-6 flex items-center justify-center bg-white text-gray-600 rounded shadow-sm hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                    >
                      -
                    </button>
                    <p className="text-xl font-bold min-w-[3rem] text-center">
                      {trajet.nombre_places_totales - trajet.places_disponibles} / {trajet.nombre_places_totales}
                    </p>
                    <button 
                      onClick={() => handleManualPassenger(trajet.id, 'add')}
                      disabled={trajet.places_disponibles === 0}
                      className="w-6 h-6 flex items-center justify-center bg-white text-gray-600 rounded shadow-sm hover:text-green-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleSeePassengers(trajet.id)}
                  className="bg-gray-100 text-gainde-dark px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition"
                  title="Voir les passagers"
                >
                  👥
                </button>

                {(trajet.statut === 'PUBLIE' || trajet.statut === 'A_VENIR' || trajet.statut === 'EN_ATTENTE') && (
                  <button 
                    onClick={() => handleStatusChange(trajet.id, 'demarrer')}
                    className="bg-gainde-dark text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition shadow-sm"
                  >
                    🚀 Démarrer
                  </button>
                )}

                {trajet.statut === 'EN_COURS' && (
                  <button 
                    onClick={() => handleStatusChange(trajet.id, 'terminer')}
                    className="bg-gainde-yellow text-gainde-dark px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 transition shadow-sm"
                  >
                    🏁 Terminer
                  </button>
                )}

                {trajet.statut === 'TERMINE' && (
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold">
                    ✅ Arrivé
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE CHAUFFEUR : LISTE DES PASSAGERS */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h2 className="text-2xl font-bold text-gainde-dark mb-6">Liste des passagers</h2>
            
            {loadingPassagers ? (
              <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gainde-yellow mx-auto"></div></div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {selectedTrajetPassagers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Aucune réservation pour le moment.</p>
                ) : (
                  selectedTrajetPassagers.map((res) => (
                    <div key={res.id} className={`flex items-center justify-between p-4 rounded-2xl border ${res.statut === 'EN_ATTENTE' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 text-white rounded-full flex items-center justify-center font-bold ${res.statut === 'EN_ATTENTE' ? 'bg-yellow-500' : 'bg-gainde-dark'}`}>
                          {res.passager?.prenom?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gainde-dark text-lg">
                            {res.passager?.prenom} {res.passager?.nom}
                          </p>
                          
                          {res.statut === 'ACCEPTEE' && (
                            <div className="flex items-center gap-4 mt-1">
                              <a href={`tel:${res.passager?.telephone}`} className="flex items-center gap-1 text-gray-600 text-sm font-semibold hover:text-gainde-dark transition">
                                📞 Appel
                              </a>
                              <a 
                                href={`https://wa.me/${res.passager?.telephone?.replace(/[^0-9+]/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 text-[#25D366] text-sm font-bold hover:text-green-700 transition"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}

                          {res.statut === 'EN_ATTENTE' && (
                            <span className="text-yellow-600 text-xs font-bold bg-yellow-100 px-2 py-1 rounded">En attente de validation</span>
                          )}
                        </div>
                      </div>

                      {res.statut === 'EN_ATTENTE' && (
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleReservationAction(res.id, 'accepter', res.trajet_id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition"
                          >
                            Accepter
                          </button>
                          <button 
                            onClick={() => handleReservationAction(res.id, 'refuser', res.trajet_id)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold transition"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            <button onClick={() => setShowModal(false)} className="w-full mt-8 bg-gray-800 hover:bg-black transition text-white py-3 rounded-xl font-bold">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODALE PASSAGER : ÉVALUER LE CHAUFFEUR */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h2 className="text-2xl font-bold text-gainde-dark mb-2">Noter votre trajet</h2>
            <p className="text-gray-500 text-sm mb-6">Votre avis aide à maintenir la qualité de Warr Gaïndé.</p>
            
            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Note (sur 5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewData({...reviewData, rating: star})}
                      className={`text-4xl transition-transform ${reviewData.rating >= star ? 'text-gainde-yellow scale-110' : 'text-gray-200 hover:text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Commentaire (optionnel)</label>
                <textarea 
                  rows="3" 
                  placeholder="Comment s'est passé le trajet avec ce chauffeur ?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none resize-none"
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={submittingReview}
                className={`w-full py-3 rounded-xl font-bold transition ${
                  submittingReview ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gainde-dark text-white hover:bg-black'
                }`}
              >
                {submittingReview ? 'Envoi...' : 'Envoyer mon avis'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;