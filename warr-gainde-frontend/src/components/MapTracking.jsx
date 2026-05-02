import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/axios';
import echo from '/src/echo'; // Assurez-vous que votre instance Echo est correctement exportée depuis ce chemin

// Correction icône Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icône personnalisée voiture
const carIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

function MapTracking({ trajetId }) {
  const [position, setPosition]     = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const channelRef                  = useRef(null);

  useEffect(() => {
    // 1. Charger la dernière position connue (fallback immédiat)
    api.get(`/trajets/${trajetId}/gps/derniere`)
      .then(res => {
        if (res.data.success) {
          setPosition([res.data.data.lat, res.data.data.lng]);
          setLastUpdate(res.data.data.updated_at);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 2. S'abonner au canal WebSocket Reverb
    channelRef.current = echo.channel(`trajet.${trajetId}`);

    channelRef.current
      .listen('.position.updated', (data) => {
        setPosition([data.lat, data.lng]);
        setLastUpdate('À l\'instant');
        setConnected(true);
      })
      .subscribed(() => {
        setConnected(true);
      })
      .error(() => {
        setConnected(false);
      });

    // 3. Nettoyage à la destruction du composant
    return () => {
      if (channelRef.current) {
        echo.leaveChannel(`trajet.${trajetId}`);
      }
    };
  }, [trajetId]);

  if (loading) {
    return (
      <div className="h-64 w-full rounded-2xl bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gainde-yellow mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 font-medium">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="h-64 w-full rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-sm font-bold text-gray-600">
            En attente du signal GPS du chauffeur
          </p>
          <p className="text-xs text-gray-400 mt-1">
            La position apparaîtra dès que le trajet démarrera
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Indicateur de connexion WebSocket */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`relative flex h-3 w-3 ${connected ? 'visible' : 'invisible'}`}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-green-600">
            {connected ? 'Suivi en direct' : 'Dernière position connue'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-gray-400">{lastUpdate}</span>
        )}
      </div>

      {/* CARTE */}
      <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200">
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={position} icon={carIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-sm">🚗 Chauffeur</p>
                {lastUpdate && (
                  <p className="text-xs text-gray-500 mt-1">{lastUpdate}</p>
                )}
              </div>
            </Popup>
          </Marker>
          <RecenterMap position={position} />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapTracking;