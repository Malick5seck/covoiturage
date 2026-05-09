import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { toast } from "../utils/toast";

function Recherche() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const depart = searchParams.get("depart") || "";
  const arrivee = searchParams.get("arrivee") || "";
  const date = searchParams.get("date") || "";

  const [localDepart, setLocalDepart] = useState(depart);
  const [localArrivee, setLocalArrivee] = useState(arrivee);
  const [localDate, setLocalDate] = useState(date);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // États pour la modale de réservation avancée
  const [showResaModal, setShowResaModal] = useState(false);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [resaForm, setResaForm] = useState({
    nombre_places: 1,
    type_reservation: "CLASSIQUE",
    est_pour_un_tiers: false,
    nom_passager_tiers: "",
    tel_passager_tiers: "",
    est_privatisee: false,
    point_embarquement_nom: "",
    point_embarquement_lat: "",
    point_embarquement_long: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTrajets = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/trajets", {
          params: { ville_depart: depart, ville_arrivee: arrivee, date: date },
        });
        setTrajets(response.data.data || response.data);
      } catch (err) {
        setError("Impossible de charger les trajets pour le moment.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrajets();
  }, [depart, arrivee, date]);

  const handleNouvelleRecherche = (e) => {
    e.preventDefault();
    setSearchParams({
      depart: localDepart,
      arrivee: localArrivee,
      date: localDate,
    });
  };

  const handleAjoutManuel = async (trajetId, placesDispo) => {
    if (placesDispo <= 0) {
      toast.warning("Le véhicule est déjà plein.");
      return;
    }
    try {
      const response = await api.post(`/trajets/${trajetId}/passager-manuel`, {
        nombre_places: 1,
      });
      if (response.data.success) {
        setTrajets(
          trajets.map((t) =>
            t.id === trajetId
              ? { ...t, places_disponibles: t.places_disponibles - 1 }
              : t,
          ),
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de l'ajout manuel.",
      );
    }
  };

  const handleLiberePlace = async (trajetId, placesDispo, placesMax) => {
    if (placesDispo >= placesMax) {
      toast.warning("Toutes les places sont déjà libres.");
      return;
    }
    try {
      const response = await api.post(`/trajets/${trajetId}/place-liberee`, {
        nombre_places: 1,
      });
      if (response.data.success) {
        setTrajets(
          trajets.map((t) =>
            t.id === trajetId
              ? { ...t, places_disponibles: t.places_disponibles + 1 }
              : t,
          ),
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Erreur lors de la libération de la place.",
      );
    }
  };

  // Ouvre la modale de réservation avancée
  const handleOpenReservation = (trajet) => {
    if (!user) {
      // Redirige vers la page de connexion et sauvegarde l'URL actuelle
      navigate("/login", { state: { from: location } });
      return;
    }
    setSelectedTrajet(trajet);
    setResaForm({
      nombre_places: 1,
      type_reservation: "CLASSIQUE",
      est_pour_un_tiers: false,
      nom_passager_tiers: "",
      tel_passager_tiers: "",
      est_privatisee: false,
      point_embarquement_nom: "",
      point_embarquement_lat: "",
      point_embarquement_long: "",
    });
    setShowResaModal(true);
  };

  // Fermer la modale
  const closeResaModal = () => {
    setShowResaModal(false);
    setSelectedTrajet(null);
  };

  // Gestion des changements dans le formulaire
  const handleResaChange = (field, value) => {
    setResaForm((prev) => ({ ...prev, [field]: value }));
  };

  // Bouton GPS pour le point d'embarquement
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.warning("La géolocalisation n'est pas supportée.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleResaChange(
          "point_embarquement_lat",
          pos.coords.latitude.toString(),
        );
        handleResaChange(
          "point_embarquement_long",
          pos.coords.longitude.toString(),
        );
        handleResaChange(
          "point_embarquement_nom",
          `Position GPS (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
        );
        toast.success("Position GPS capturée.");
      },
      (err) => {
        toast.error(
          "Impossible de récupérer la position. Vérifiez les permissions GPS.",
        );
      },
      { enableHighAccuracy: true },
    );
  };

  // Soumission de la réservation
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrajet) return;

    const places = resaForm.est_privatisee
      ? selectedTrajet.places_disponibles
      : resaForm.nombre_places;
    if (places < 1 || places > selectedTrajet.places_disponibles) {
      toast.error("Nombre de places invalide.");
      return;
    }

    const payload = {
      trajet_id: selectedTrajet.id,
      nombre_places: places,
      type_reservation: resaForm.type_reservation,
      est_pour_un_tiers: resaForm.est_pour_un_tiers,
      nom_passager_tiers: resaForm.est_pour_un_tiers
        ? resaForm.nom_passager_tiers
        : undefined,
      tel_passager_tiers: resaForm.est_pour_un_tiers
        ? resaForm.tel_passager_tiers
        : undefined,
      est_privatisee: resaForm.est_privatisee,
      point_embarquement_nom: resaForm.point_embarquement_nom || undefined,
      point_embarquement_lat: resaForm.point_embarquement_lat || undefined,
      point_embarquement_long: resaForm.point_embarquement_long || undefined,
    };

    setSubmitting(true);
    try {
      const response = await api.post(
        `/trajets/${selectedTrajet.id}/reserver`,
        payload,
      );
      if (response.data.success) {
        toast.success(response.data.message || "Réservation enregistrée.");
        setTrajets(
          trajets.map((t) =>
            t.id === selectedTrajet.id
              ? { ...t, places_disponibles: t.places_disponibles - places }
              : t,
          ),
        );
        closeResaModal();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de la réservation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* FORMULAIRE DE RECHERCHE */}
      <div className="bg-gainde-dark rounded-3xl shadow-lg p-6 mb-8">
        <form
          onSubmit={handleNouvelleRecherche}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">
              Départ
            </label>
            <input
              type="text"
              placeholder="Ex: Dakar"
              className="w-full px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-gainde-yellow"
              value={localDepart}
              onChange={(e) => setLocalDepart(e.target.value)}
            />
          </div>

          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">
              Arrivée
            </label>
            <input
              type="text"
              placeholder="Ex: Thiès"
              className="w-full px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-gainde-yellow"
              value={localArrivee}
              onChange={(e) => setLocalArrivee(e.target.value)}
            />
          </div>

          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-gainde-yellow text-gray-700"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-gainde-yellow text-gainde-dark px-8 py-3 rounded-xl font-black hover:bg-yellow-500 transition shadow-md"
          >
            Rechercher
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gainde-yellow mx-auto"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-gainde-red p-6 rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      {!loading && !error && trajets.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gainde-dark mb-2">
            Aucun trajet trouvé
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Aucun conducteur n'a prévu ce trajet avec vos critères. Essayez de
            changer la date ou la ville !
          </p>
        </div>
      )}

      {!loading && trajets.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {trajets.map((trajet) => (
            <div
              key={trajet.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col md:flex-row justify-between items-center gap-6"
            >
              {/* Infos Conducteur */}
              <div className="flex items-center gap-4 w-full md:w-1/3">
                <div className="w-14 h-14 bg-gainde-yellow rounded-full flex items-center justify-center text-xl font-black text-gainde-dark border border-gray-100 overflow-hidden">
                  {trajet.conducteur?.photo_profil ? (
                    <img
                      src={trajet.conducteur.photo_profil}
                      alt="Chauffeur"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    trajet.conducteur?.prenom?.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gainde-dark text-lg leading-tight">
                    {trajet.conducteur?.prenom} {trajet.conducteur?.nom}
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap items-center gap-1">
                    ⭐{" "}
                    {trajet.conducteur?.note_moyenne != null
                      ? Number(trajet.conducteur.note_moyenne).toFixed(1)
                      : "N/A"}{" "}
                    • {trajet.vehicule?.marque_modele || "Véhicule standard"}
                    {/* Climatisation */}
                    {trajet.vehicule?.climatisation ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full ml-1">
                        ❄️ Climatisé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full ml-1">
                        🌬️ Sans clim
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Itinéraire */}
              <div className="flex flex-col items-center w-full md:w-1/3">
                <div className="flex justify-between w-full text-sm font-bold text-gray-400 mb-1">
                  <span>{trajet.date_heure_depart?.substring(11, 16)}</span>
                  <span>
                    {trajet.heure_arrivee_estimee
                      ? trajet.heure_arrivee_estimee.substring(0, 5)
                      : "--:--"}
                  </span>
                </div>
                <div className="w-full flex items-center gap-2">
                  <div className="w-3 h-3 bg-gainde-dark rounded-full"></div>
                  <div className="flex-1 h-0.5 bg-gray-200 relative">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-[10px] px-2 text-gray-400 font-bold rounded-full">
                      TRAJET
                    </div>
                  </div>
                  <div className="w-3 h-3 border-2 border-gainde-dark bg-white rounded-full"></div>
                </div>
                <div className="flex justify-between w-full text-sm font-bold text-gainde-dark mt-1">
                  <span>{trajet.ville_depart}</span>
                  <span>{trajet.ville_arrivee}</span>
                </div>
              </div>

              {/* Prix & Actions */}
              <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-1/3">
                <div className="text-right">
                  <p className="text-2xl font-black text-gainde-dark">
                    {trajet.prix_par_place} FCFA
                  </p>
                  <p
                    className={`text-sm font-bold mt-1 ${trajet.places_disponibles > 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {trajet.places_disponibles > 0
                      ? `${trajet.places_disponibles} places restantes`
                      : "Complet"}
                  </p>
                </div>

                {user &&
                user.id === trajet.conducteur_id &&
                user.role_actuel === "CHAUFFEUR" ? (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() =>
                        handleLiberePlace(
                          trajet.id,
                          trajet.places_disponibles,
                          trajet.nombre_places_totales,
                        )
                      }
                      disabled={
                        trajet.places_disponibles >=
                        trajet.nombre_places_totales
                      }
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition disabled:opacity-50 shadow-sm"
                      title="Un passager est descendu"
                    >
                      ➖
                    </button>
                    <button
                      onClick={() =>
                        handleAjoutManuel(trajet.id, trajet.places_disponibles)
                      }
                      disabled={trajet.places_disponibles <= 0}
                      className="bg-gray-100 text-gainde-dark px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50 shadow-sm"
                      title="Ajouter un passager"
                    >
                      ➕ Ajout (1)
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenReservation(trajet)}
                    disabled={trajet.places_disponibles <= 0}
                    className="bg-gainde-dark text-white px-6 py-2.5 rounded-xl font-bold mt-3 hover:bg-black transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md w-full md:w-auto"
                  >
                    {trajet.places_disponibles > 0
                      ? "Réserver ma place"
                      : "Trajet Complet"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE DE RÉSERVATION AVANCÉE */}
      {showResaModal && selectedTrajet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeResaModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>

            {/* Photo du véhicule */}
            {selectedTrajet.vehicule?.photo_vehicule && (
              <div className="w-full h-40 rounded-xl overflow-hidden mb-4">
                <img
                  src={selectedTrajet.vehicule.photo_vehicule}
                  alt="Véhicule"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h2 className="text-2xl font-bold text-gainde-dark mb-2">
              Réserver une place
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {selectedTrajet.ville_depart} → {selectedTrajet.ville_arrivee} •{" "}
              {selectedTrajet.prix_par_place} FCFA / place
            </p>

            <form onSubmit={handleReservationSubmit} className="space-y-4">
              {/* Nombre de places (sauf si privatisé) */}
              {!resaForm.est_privatisee && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre de places
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedTrajet.places_disponibles}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                    value={resaForm.nombre_places}
                    onChange={(e) =>
                      handleResaChange(
                        "nombre_places",
                        parseInt(e.target.value) || 1,
                      )
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedTrajet.places_disponibles} place(s) disponible(s)
                  </p>
                </div>
              )}

              {/* Type de réservation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none bg-white"
                  value={resaForm.type_reservation}
                  onChange={(e) =>
                    handleResaChange("type_reservation", e.target.value)
                  }
                >
                  <option value="CLASSIQUE">Classique (avant départ)</option>
                  <option value="EN_ROUTE">
                    En route (point d'embarquement)
                  </option>
                </select>
              </div>

              {/* Point d'embarquement */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Point d'embarquement
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nom du lieu ou adresse"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none"
                    value={resaForm.point_embarquement_nom}
                    onChange={(e) =>
                      handleResaChange("point_embarquement_nom", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="bg-gray-200 px-3 py-3 rounded-xl text-sm font-semibold hover:bg-gray-300"
                  >
                    📍 GPS
                  </button>
                </div>
                {(resaForm.point_embarquement_lat ||
                  resaForm.point_embarquement_long) && (
                  <p className="text-xs text-gray-400 mt-1">
                    Lat: {resaForm.point_embarquement_lat?.substring(0, 8)} Lng:{" "}
                    {resaForm.point_embarquement_long?.substring(0, 8)}
                  </p>
                )}
              </div>

              {/* Options supplémentaires */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resaForm.est_pour_un_tiers}
                    onChange={(e) =>
                      handleResaChange("est_pour_un_tiers", e.target.checked)
                    }
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Réserver pour un tiers
                  </span>
                </label>

                {resaForm.est_pour_un_tiers && (
                  <div className="grid grid-cols-2 gap-2 ml-4">
                    <input
                      type="text"
                      required
                      placeholder="Nom du passager"
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gainde-yellow"
                      value={resaForm.nom_passager_tiers}
                      onChange={(e) =>
                        handleResaChange("nom_passager_tiers", e.target.value)
                      }
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Téléphone"
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gainde-yellow"
                      value={resaForm.tel_passager_tiers}
                      onChange={(e) =>
                        handleResaChange("tel_passager_tiers", e.target.value)
                      }
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resaForm.est_privatisee}
                    onChange={(e) => {
                      const privatise = e.target.checked;
                      handleResaChange("est_privatisee", privatise);
                      if (privatise) {
                        handleResaChange(
                          "nombre_places",
                          selectedTrajet.places_disponibles,
                        );
                      }
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Privatiser le véhicule ({selectedTrajet.places_disponibles}{" "}
                    place(s) restante(s))
                  </span>
                </label>
              </div>

              {/* Récapitulatif */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-bold text-gainde-dark">
                  Total estimé :{" "}
                  {(
                    selectedTrajet.prix_par_place *
                    (resaForm.est_privatisee
                      ? selectedTrajet.places_disponibles
                      : resaForm.nombre_places)
                  ).toLocaleString("fr-FR")}{" "}
                  FCFA
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Paiement à effectuer au chauffeur à l'embarquement.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gainde-dark text-white py-3 rounded-xl font-bold hover:bg-black transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? "Réservation..." : "Confirmer la réservation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recherche;