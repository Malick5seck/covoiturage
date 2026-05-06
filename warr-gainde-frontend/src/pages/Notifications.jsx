import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';

function Notifications() {
  const navigate = useNavigate();
  const [user] = useState(() => getUser());

  const [notifications, setNotifications] = useState([]);
  const [nonLuesCount, setNonLuesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data.data || []);
        setNonLuesCount(response.data.non_lues_count || 0);
      } catch (err) {
        console.error("Erreur chargement notifications", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, navigate]);

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/lire`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, date_lecture: new Date().toISOString() } : n
      ));
      setNonLuesCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erreur lors de la lecture", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/lire-tout');
      setNotifications(notifications.map(n => ({ ...n, date_lecture: new Date().toISOString() })));
      setNonLuesCount(0);
    } catch (err) {
      console.error("Erreur lecture globale", err);
    }
  };

  // Mapping type → libellé lisible
  const typeLabel = {
    RESERVATION_RECUE:    'Nouvelle demande',
    RESERVATION_ACCEPTEE: 'Réservation acceptée',
    RESERVATION_REFUSEE:  'Réservation refusée',
    RESERVATION_ANNULEE:  'Réservation annulée',
    DEPART_IMMINENT:      'Départ imminent',
    ARRIVEE:              'Arrivée',
    ANNULATION:           'Trajet annulé',
    RECHARGE_EFFECTUEE:   'Recharge confirmée',
    PAIEMENT_VALIDE:      'Paiement validé',
    TRAJET_PLEIN:         'Trajet complet',
  };

  if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div></div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gainde-dark">Mes Notifications</h1>
          <p className="text-gray-500 mt-2">Suivez l'activité de vos trajets et réservations.</p>
        </div>
        
        {nonLuesCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-sm font-bold text-gainde-dark bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition shadow-sm"
          >
            Tout marquer comme lu ✓
          </button>
        )}
      </div>

      {/* LISTE VIDE */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-700">Aucune notification</h3>
          <p className="text-gray-500 mt-2">Vous êtes à jour !</p>
        </div>
      ) : (
        
        /* LISTE DES NOTIFICATIONS */
        <div className="grid gap-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-6 rounded-2xl border transition-all ${
                !notif.date_lecture ? 'bg-white border-gainde-yellow shadow-md' : 'bg-gray-50 border-gray-100 opacity-75'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  
                  {/* Titre basé sur le type de notification */}
                  <h3 className={`font-bold text-lg ${!notif.date_lecture ? 'text-gainde-dark' : 'text-gray-600'}`}>
                    {typeLabel[notif.type] || 'Notification'}
                  </h3>
                  
                  <p className="text-gray-600 mt-1">{notif.message}</p>
                  
                  <p className="text-xs text-gray-400 mt-3 font-semibold">
                    {new Date(notif.created_at).toLocaleString('fr-FR', { 
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
                
                {/* BOUTON MARQUER COMME LU */}
                {!notif.date_lecture && (
                  <button 
                    onClick={() => markAsRead(notif.id)}
                    className="w-4 h-4 bg-gainde-yellow rounded-full flex-shrink-0 animate-pulse hover:scale-125 transition-transform cursor-pointer"
                    title="Marquer comme lu"
                  ></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;