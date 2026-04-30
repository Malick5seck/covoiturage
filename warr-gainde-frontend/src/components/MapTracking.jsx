import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/axios';

// Correction icône Leaflet (bug classique)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapTracking({ trajetId }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const fetchPos = async () => {
      try {
        const res = await api.get(`/trajets/${trajetId}/gps/derniere`);
        if (res.data.success) setPosition([res.data.data.lat, res.data.data.lng]);
      } catch (e) { console.log("GPS non dispo"); }
    };

    fetchPos();
    const interval = setInterval(fetchPos, 30000); // Rafraîchir toutes les 30s
    return () => clearInterval(interval);
  }, [trajetId]);

  if (!position) return <div className="p-4 bg-gray-100 rounded-2xl text-center">En attente du signal GPS du chauffeur...</div>;

  return (
    <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border">
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position}>
          <Popup>Le chauffeur est ici 🚗</Popup>
        </Marker>
        <RecenterMap position={position} />
      </MapContainer>
    </div>
  );
}

// Petit sous-composant pour recentrer la carte quand la position change
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => { map.setView(position); }, [position, map]);
  return null;
}

export default MapTracking;