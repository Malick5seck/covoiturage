import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { toast } from "../utils/toast";

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

  // État pour les erreurs de validation par champ
  const [fieldErrors, setFieldErrors] = useState({});

  const vehiculeSelectionne = mesVehicules.find(
    (v) => v.id.toString() === formData.vehicule_id.toString(),
  );
  const placesMax = vehiculeSelectionne
    ? vehiculeSelectionne.nombre_places_max
    : 0;
  const commissionEstimee =
    parseFloat(formData.prix_place || 0) * placesMax * 0.05;

  // Validation d'un seul champ (appelée onChange)
  const validateField = (name, value) => {
    let erreur = "";
    const val = value.toString().trim();
    switch (name) {
      case "ville_depart":
      case "ville_arrivee":
        if (!val) erreur = "Ce champ est obligatoire.";
        else if (val.length < 2) erreur = "Minimum 2 caractères.";
        break;
      case "point_embarquement":
        if (!val) erreur = "Le point d'embarquement est obligatoire.";
        break;
      case "date_depart":
        if (!val) erreur = "La date est obligatoire.";
        else {
          const selected = new Date(val + "T00:00:00");
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selected < today) erreur = "La date doit être aujourd'hui ou dans le futur.";
        }
        break;
      case "heure_depart":
      case "heure_arrivee_estimee":
        if (!val) erreur = "L'heure est obligatoire.";
        break;
      case "prix_place":
        if (!val) erreur = "Le prix est obligatoire.";
        else if (isNaN(parseFloat(val)) || parseFloat(val) < 500)
          erreur = "Le prix minimum est de 500 FCFA.";
        break;
      case "vehicule_id":
        if (!val) erreur = "Veuillez sélectionner un véhicule.";
        break;
      default:
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [name]: erreur }));
    return erreur;
  };

  // Gestionnaire générique pour mettre à jour un champ et sa validation
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  // Validation complète au submit
  const validateForm = () => {
    const erreurs = {};
    Object.keys(formData).forEach((key) => {
      if (key === "point_embarquement" || key === "ville_depart" || key === "ville_arrivee" || key === "date_depart" || key === "heure_depart" || key === "heure_arrivee_estimee" || key === "prix_place" || key === "vehicule_id") {
        const err = validateField(key, formData[key]);
        if (err) erreurs[key] = err;
      }
    });
    setFieldErrors(erreurs);
    return Object.keys(erreurs).length === 0;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.warning("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setFormData({
      ...formData,
      point_embarquement: "Recherche du signal GPS...",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        setMapPosition(coords);

        setFormData({
          ...formData,
          point_embarquement: `Coordonnées GPS : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
      },
      (error) => {
        console.error("Erreur GPS:", error);
        setFormData({ ...formData, point_embarquement: "" });
        toast.error(
          "Impossible de récupérer votre position. Vérifiez les permissions GPS.",
        );
      },
      { enableHighAccuracy: true },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs avant de publier.");
      return;
    }

    if (soldeActuel < commissionEstimee) {
      setError(`Solde insuffisant...`);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/trajets", formData);
      if (response.status === 201 || response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/mes-trajets");
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de publication.");
    } finally {
      setLoading(false);
    }
  };

  // Helper pour afficher une erreur sous un champ
  const fieldError = (name) => fieldErrors[name] ? (
    <p className="text-red-500 text-xs mt-1">{fieldErrors[name]}</p>
  ) : null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gainde-dark">
            Publier un trajet
          </h1>
          <p className="text-gray-500 mt-2">
            Où allez-vous conduire aujourd'hui ?
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-gainde-red text-gainde-red font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-gainde-green text-gainde-green font-medium">
            ✅ Trajet publié avec succès ! Redirection en cours...
          </div>
        )}

        {mesVehicules.length === 0 && !loading && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-gainde-yellow text-yellow-800 font-medium flex justify-between items-center">
            <span>
              ⚠️ Vous devez enregistrer un véhicule avant de publier un trajet.
            </span>
            <button
              onClick={() => navigate("/mon-vehicule")}
              className="bg-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
            >
              Ajouter un véhicule
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ITINÉRAIRE */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gainde-dark mb-4 border-b pb-2">
              📍 Itinéraire et Lieu de rencontre
            </h3>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ville de départ
                </label>
                <input
                  type="text"
                  name="ville_depart"
                  required
                  placeholder="Ex: Dakar"
                  className={`w-full px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.ville_depart ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.ville_depart}
                  onChange={handleFieldChange}
                />
                {fieldError("ville_depart")}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ville d'arrivée
                </label>
                <input
                  type="text"
                  name="ville_arrivee"
                  required
                  placeholder="Ex: Thiès"
                  className={`w-full px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.ville_arrivee ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.ville_arrivee}
                  onChange={handleFieldChange}
                />
                {fieldError("ville_arrivee")}
              </div>
            </div>

            <div className="w-full mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Point d'embarquement exact
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  name="point_embarquement"
                  required
                  placeholder="Ex: Gare Routière, ou coordonnées..."
                  className={`flex-1 px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.point_embarquement ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.point_embarquement}
                  onChange={handleFieldChange}
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>📍</span> Ma position
                </button>
              </div>
              {fieldError("point_embarquement")}

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
                  name="date_depart"
                  required
                  className={`w-full px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.date_depart ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.date_depart}
                  onChange={handleFieldChange}
                />
                {fieldError("date_depart")}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Heure départ
                </label>
                <input
                  type="time"
                  name="heure_depart"
                  required
                  className={`w-full px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.heure_depart ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.heure_depart}
                  onChange={handleFieldChange}
                />
                {fieldError("heure_depart")}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Heure d'arrivée (est.)
                </label>
                <input
                  type="time"
                  name="heure_arrivee_estimee"
                  required
                  className={`w-full px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.heure_arrivee_estimee ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.heure_arrivee_estimee}
                  onChange={handleFieldChange}
                />
                {fieldError("heure_arrivee_estimee")}
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
                  name="vehicule_id"
                  required
                  className={`w-full px-4 py-3 rounded-xl border bg-white outline-none ${
                    fieldErrors.vehicule_id ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.vehicule_id}
                  onChange={handleFieldChange}
                >
                  <option value="">Sélectionnez un véhicule...</option>
                  {mesVehicules.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marque_modele} ({v.immatriculation}) -{" "}
                      {v.nombre_places_max} places max
                    </option>
                  ))}
                </select>
                {fieldError("vehicule_id")}
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix par place (FCFA)
                </label>
                <input
                  type="number"
                  name="prix_place"
                  min="500"
                  step="100"
                  required
                  placeholder="Ex: 2500"
                  className={`w-full px-4 py-3 rounded-xl border outline-none ${
                    fieldErrors.prix_place ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:border-gainde-yellow"
                  }`}
                  value={formData.prix_place}
                  onChange={handleFieldChange}
                />
                {fieldError("prix_place")}
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