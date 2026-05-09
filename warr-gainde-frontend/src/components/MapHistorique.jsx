import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/axios';

// ── Correction icône Leaflet ──────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes personnalisées départ / arrivée
const departIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const arriveeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Ajuste le zoom pour englober tous les points
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [32, 32] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [positions, map]);
  return null;
}

/**
 * MapHistorique — affiche le tracé GPS enregistré pendant un trajet TERMINÉ.
 *
 * Props :
 *   trajetId      {number}  — id du trajet
 *   villeDepart   {string}  — label départ (pour le popup)
 *   villeArrivee  {string}  — label arrivée (pour le popup)
 */
function MapHistorique({ trajetId, villeDepart, villeArrivee }) {
  const [positions, setPositions] = useState([]); // [[lat, lng], ...]
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!trajetId) return;

    api.get(`/trajets/${trajetId}/gps/historique`)
      .then(res => {
        const raw = res.data.data || [];
        // Le backend renvoie { latitude, longitude, date_position }
        const coords = raw
          .map(p => [parseFloat(p.latitude), parseFloat(p.longitude)])
          .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
        setPositions(coords);
      })
      .catch(() => setError('Impossible de charger le tracé GPS.'))
      .finally(() => setLoading(false));
  }, [trajetId]);

  // ── États d'affichage ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-52 w-full rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gainde-yellow mx-auto mb-2" />
          <p className="text-xs text-gray-400 font-medium">Chargement du tracé…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-52 w-full rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
        <p className="text-sm text-red-500 font-medium">{error}</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="h-52 w-full rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm font-bold text-gray-500">Aucun tracé GPS disponible</p>
          <p className="text-xs text-gray-400 mt-1">
            Le suivi GPS n'était pas actif pendant ce trajet.
          </p>
        </div>
      </div>
    );
  }

  const debut  = positions[0];
  const fin    = positions[positions.length - 1];
  const nbPts  = positions.length;

  // Durée approximative : si on a date_position on pourrait calculer,
  // mais ici on affiche juste le nombre de points enregistrés.
  return (
    <div className="space-y-2">

      {/* Méta-info tracé */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1 font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Tracé enregistré
        </span>
        <span>{nbPts} point{nbPts > 1 ? 's' : ''} GPS</span>
      </div>

      {/* Carte */}
      <div className="h-56 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200">
        <MapContainer
          center={debut}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Tracé de la route */}
          <Polyline
            positions={positions}
            pathOptions={{ color: '#F5A623', weight: 4, opacity: 0.85, dashArray: null }}
          />

          {/* Marqueur départ */}
          <Marker position={debut} icon={departIcon}>
            <Popup>
              <div className="text-center text-sm">
                <p className="font-bold text-green-700">🟢 Départ</p>
                <p className="text-gray-600">{villeDepart || 'Départ'}</p>
              </div>
            </Popup>
          </Marker>

          {/* Marqueur arrivée (seulement si différent du départ) */}
          {nbPts > 1 && (
            <Marker position={fin} icon={arriveeIcon}>
              <Popup>
                <div className="text-center text-sm">
                  <p className="font-bold text-red-600">🏁 Arrivée</p>
                  <p className="text-gray-600">{villeArrivee || 'Arrivée'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          <FitBounds positions={positions} />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapHistorique;