import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

// 1. IMPORTS LEAFLET
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// 2. CORRECTION DU BUG D'ICÔNE LEAFLET SOUS REACT
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function Publier() {
  const navigate = useNavigate();
  const [mesVehicules, setMesVehicules] = useState([]);
  const [soldeActuel, setSoldeActuel] = useState(0);

  // NOUVEAU STATE : Pour stocker les coordonnées GPS et afficher la carte
  const [mapPosition, setMapPosition] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchVehicules = async () => {
      try {
        const res = await api.get("/vehicules");
        setMesVehicules(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchSolde = async () => {
      try {
        const res = await api.get("/user");
        setSoldeActuel(parseFloat(res.data.solde_portefeuille) || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchVehicules();
    fetchSolde();
  }, [navigate]);

  const [formData, setFormData] = useState({
    ville_depart: "",
    ville_arrivee: "",
    point_embarquement: "",
    date_depart: "",
    heure_depart: "",
    heure_arrivee_estimee: "",
    prix_place: "",
    vehicule_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const vehiculeSelectionne = mesVehicules.find(
    (v) => v.id.toString() === formData.vehicule_id.toString(),
  );
  const placesMax = vehiculeSelectionne
    ? vehiculeSelectionne.nombre_places_max
    : 0;
  const commissionEstimee =
    parseFloat(formData.prix_place || 0) * placesMax * 0.05;

  // --- RÉCUPÉRATION DE LA POSITION & AFFICHAGE DE LA CARTE ---
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    // Affiche un petit message de chargement temporaire dans l'input
    setFormData({
      ...formData,
      point_embarquement: "Recherche du signal GPS...",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        // On met à jour l'état de la carte pour l'afficher
        setMapPosition(coords);

        // On remplit l'input
        setFormData({
          ...formData,
          point_embarquement: `Coordonnées GPS : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
      },
      (error) => {
        console.error("Erreur GPS:", error);
        setFormData({ ...formData, point_embarquement: "" });
        alert(
          "Impossible de récupérer votre position. Veuillez vérifier vos permissions GPS.",
        );
      },
      { enableHighAccuracy: true }, // Demande plus de précision
    );
  };

  const handleSubmit = async (e) => {
    // ... (Ton code handleSubmit reste exactement le même)
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (soldeActuel < commissionEstimee) {
      setError(`Solde insuffisant...`);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/trajets", formData);
      if (response.status === 201 || response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate(
            `/recherche?depart=${formData.ville_depart}&arrivee=${formData.ville_arrivee}`,
          );
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de publication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        {/* ... (En-tête, alertes d'erreur et véhicules comme avant) ... */}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">
              📍 Itinéraire et Lieu de rencontre
            </h3>

            {/* ... (Inputs Villes départ/arrivée) ... */}

            <div className="w-full mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Point d'embarquement exact
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ex: Gare Routière, ou coordonnées..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.point_embarquement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      point_embarquement: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>📍</span> Ma position
                </button>
              </div>

              {/* NOUVEAU : AFFICHAGE DE LA CARTE SI ON A LES COORDONNÉES */}
              {mapPosition && (
                <div className="mt-4 h-64 w-full rounded-xl overflow-hidden border border-gray-300 shadow-inner z-0 relative">
                  <MapContainer
                    center={mapPosition}
                    zoom={15}
                    style={{ height: "100%", width: "100%", zIndex: 1 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapPosition}>
                      <Popup>Point d'embarquement</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}
            </div>
          </div>
          {/* DATES ET HEURES */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">
              🕒 Horaires
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.date_depart}
                  onChange={(e) =>
                    setFormData({ ...formData, date_depart: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Heure départ
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.heure_depart}
                  onChange={(e) =>
                    setFormData({ ...formData, heure_depart: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Heure d'arrivée (est.)
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.heure_arrivee_estimee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heure_arrivee_estimee: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* VÉHICULE ET PRIX */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">
              💳 Détails du voyage
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Véhicule utilisé
                </label>
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none bg-white"
                  value={formData.vehicule_id}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicule_id: e.target.value })
                  }
                >
                  <option value="">Sélectionnez un véhicule...</option>
                  {mesVehicules.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marque_modele} ({v.immatriculation}) -{" "}
                      {v.nombre_places_max} places max
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix par place (FCFA)
                </label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  required
                  placeholder="Ex: 2500"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                  value={formData.prix_place}
                  onChange={(e) =>
                    setFormData({ ...formData, prix_place: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* SOLDE DISPONIBLE */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              soldeActuel >= commissionEstimee
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div>
              <p className="text-sm font-bold text-gray-700">
                Solde portefeuille
              </p>
              <p className="text-xs text-gray-500">
                Commission max. (véhicule complet) : ~
                {commissionEstimee.toFixed(0)} FCFA
              </p>
            </div>
            <div className="text-right">
              <p
                className={`font-black text-lg ${
                  soldeActuel >= commissionEstimee
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {soldeActuel.toLocaleString("fr-FR")} FCFA
              </p>
              {soldeActuel < commissionEstimee && (
                <Link
                  to="/portefeuille"
                  className="text-xs font-bold text-red-500 underline"
                >
                  Recharger →
                </Link>
              )}
            </div>
          </div>

          {/* BOUTON */}
          <button
            type="submit"
            disabled={
              loading ||
              success ||
              mesVehicules.length === 0 ||
              soldeActuel < commissionEstimee
            }
            className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition ${
              loading ||
              success ||
              mesVehicules.length === 0 ||
              soldeActuel < commissionEstimee
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gainde-dark hover:bg-gray-800"
            }`}
          >
            {loading ? "Publication en cours..." : "Publier ce trajet"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Publier;
