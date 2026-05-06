import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getUser } from "../utils/auth";
import { toast } from "../utils/toast";

function DemandesRecues() {
  const navigate = useNavigate();
  const [user] = useState(() => getUser());

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modale motif de refus
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [refusReservationId, setRefusReservationId] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [submittingRefus, setSubmittingRefus] = useState(false);

  useEffect(() => {
    if (!user || user.role_actuel !== "CHAUFFEUR") {
      navigate("/");
      return;
    }

    const fetchDemandes = async () => {
      try {
        const res = await api.get("/reservations/demandes-recues");
        setDemandes(res.data.data || []);
      } catch {
        setError("Erreur lors du chargement des demandes.");
      } finally {
        setLoading(false);
      }
    };
    fetchDemandes();
  }, [user, navigate]);

  // ── Accepter directement ──────────────────────────────────────────────────
  const handleAccepter = async (reservationId) => {
    try {
      const res = await api.post(`/reservations/${reservationId}/accepter`);
      if (res.data.success) {
        setDemandes((prev) => prev.filter((d) => d.id !== reservationId));
        toast.success("Réservation acceptée.");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Erreur lors de l'acceptation.",
      );
    }
  };

  // ── Ouvrir la modale de refus ────────────────────────────────────────────
  const handleOpenRefus = (id) => {
    setRefusReservationId(id);
    setMotifRefus("");
    setShowRefusModal(true);
  };

  // ── Confirmer le refus avec motif ─────────────────────────────────────────
  const handleConfirmerRefus = async () => {
    if (!motifRefus.trim() || motifRefus.trim().length < 3) {
      toast.error("Veuillez indiquer un motif d'au moins 3 caractères.");
      return;
    }
    setSubmittingRefus(true);
    try {
      const res = await api.post(
        `/reservations/${refusReservationId}/refuser`,
        {
          motif: motifRefus.trim(),
        },
      );
      if (res.data.success) {
        setDemandes((prev) => prev.filter((d) => d.id !== refusReservationId));
        toast.info("Réservation refusée.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du refus.");
    } finally {
      setSubmittingRefus(false);
      setShowRefusModal(false);
      setRefusReservationId(null);
      setMotifRefus("");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gainde-yellow border-t-transparent" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gainde-dark">
            Demandes reçues
          </h1>
          <p className="text-gray-500 mt-1">
            {demandes.length === 0
              ? "Aucune demande en attente."
              : `${demandes.length} demande${demandes.length > 1 ? "s" : ""} en attente de traitement.`}
          </p>
        </div>
        <button
          onClick={() => navigate("/mes-trajets")}
          className="bg-gainde-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl transition hover:bg-black flex items-center gap-1.5 shadow-sm"
        >
          Mes trajets
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium mb-6">
          {error}
        </div>
      )}

      {/* VIDE */}
      {demandes.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            Aucune demande en attente
          </h3>
          <p className="text-gray-500 mb-6">
            Les nouvelles réservations apparaîtront ici pour approbation.
          </p>
        </div>
      )}

      {/* LISTE */}
      {demandes.length > 0 && (
        <div className="grid gap-4">
          {demandes.map((demande) => (
            <div
              key={demande.id}
              className="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden"
            >
              {/* BARRE */}
              <div className="h-1.5 bg-yellow-400" />

              <div className="p-6">
                {/* PASSAGER */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-gainde-yellow text-gainde-dark rounded-full flex items-center justify-center font-black text-lg shadow-sm">
                    {demande.passager?.prenom?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-gainde-dark text-lg">
                      {demande.passager?.prenom} {demande.passager?.nom}
                    </h3>
                    <div className="flex gap-4 mt-0.5">
                      <a
                        href={`tel:${demande.passager?.telephone}`}
                        className="text-xs text-gray-500 hover:text-gainde-dark font-semibold flex items-center gap-1"
                      >
                        📞 {demande.passager?.telephone}
                      </a>
                      <a
                        href={`https://wa.me/${demande.passager?.telephone?.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-600 hover:text-green-800 font-semibold"
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>
                  <span className="bg-yellow-100 text-yellow-700 text-xs font-black px-3 py-1.5 rounded-full">
                    ⏳ En attente
                  </span>
                </div>

                {/* TRAJET */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <p className="font-black text-gainde-dark">
                      {demande.trajet?.ville_depart} →{" "}
                      {demande.trajet?.ville_arrivee}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      📅{" "}
                      {demande.trajet?.date_heure_depart
                        ? new Date(
                            demande.trajet.date_heure_depart,
                          ).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                      &nbsp;à&nbsp;
                      {demande.trajet?.date_heure_depart?.substring(11, 16)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-gainde-dark text-lg">
                      {parseInt(
                        demande.trajet?.prix_par_place || 0,
                      ).toLocaleString("fr-FR")}{" "}
                      FCFA
                    </p>
                    <p className="text-xs text-gray-400">par place</p>
                  </div>
                </div>

                {/* DÉTAILS RÉSERVATION */}
                <div className="flex flex-wrap gap-3 mb-5 text-sm">
                  <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-xl">
                    {demande.nombre_places} place(s) demandée(s)
                  </span>
                  {demande.type_reservation === "EN_ROUTE" && (
                    <span className="bg-purple-50 text-purple-700 font-bold px-3 py-1.5 rounded-xl">
                      📍 Embarquement en route
                    </span>
                  )}
                  {demande.est_pour_un_tiers && (
                    <span className="bg-orange-50 text-orange-700 font-bold px-3 py-1.5 rounded-xl">
                      👤 Pour un tiers : {demande.nom_passager_tiers}
                    </span>
                  )}
                  {demande.est_privatisee && (
                    <span className="bg-pink-50 text-pink-700 font-bold px-3 py-1.5 rounded-xl">
                      🔒 Privatisation
                    </span>
                  )}
                </div>

                {/* BOUTONS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccepter(demande.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black transition shadow-md shadow-green-200"
                  >
                    ✅ Accepter
                  </button>
                  <button
                    onClick={() => handleOpenRefus(demande.id)}
                    className="flex-1 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 py-3 rounded-xl font-black transition"
                  >
                    ❌ Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE MOTIF DE REFUS */}
      {showRefusModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => {
                setShowRefusModal(false);
                setRefusReservationId(null);
                setMotifRefus("");
              }}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
            >
              ✕
            </button>
            <h2 className="text-xl font-black text-gainde-dark mb-1">
              Refuser la réservation
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Veuillez indiquer la raison du refus.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Motif du refus <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="3"
                required
                placeholder="Ex : Véhicule complet, itinéraire modifié..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gainde-yellow outline-none resize-none text-sm"
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 3 caractères</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefusModal(false);
                  setRefusReservationId(null);
                  setMotifRefus("");
                }}
                className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmerRefus}
                disabled={submittingRefus}
                className={`flex-1 py-3 rounded-xl font-bold transition ${
                  submittingRefus
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {submittingRefus ? "Envoi..." : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DemandesRecues;
