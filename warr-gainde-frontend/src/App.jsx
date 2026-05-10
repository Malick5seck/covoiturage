import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "./utils/toast";
import Navbar from "./components/Navbar";

// Pages auth
import Login    from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Pages communes
import Home          from "./pages/Home";
import Recherche     from "./pages/Recherche";
import Profil        from "./pages/Profil";
import Notifications from "./pages/Notifications";
import AddPhoto      from "./components/AddPhoto";
import AttenteValidation from "./pages/AttenteValidation";
import EvaluationsRecues from "./pages/EvaluationsRecues";

// Pages passager
import MesReservations from "./pages/MesReservations";

// Pages chauffeur
import MesTrajets    from "./pages/MesTrajets";
import DemandesRecues from "./pages/DemandesRecues";
import Publier       from "./pages/Publier";
import MonVehicule   from "./pages/MonVehicule";
import Portefeuille  from "./pages/Portefeuille";

// Admin
import AdminDashboard from "./pages/AdminDashboard";

function App() {
 
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "1rem",
            padding: "12px 16px",
            maxWidth: "min(100vw - 2rem, 28rem)",
            fontSize: "0.925rem",
          },
          success: {
            style: { background: "#f0fdf4", color: "#14532d" },
            iconTheme: { primary: "#16a34a", secondary: "#fff" },
          },
          error: {
            style: { background: "#fef2f2", color: "#991b1b" },
            iconTheme: { primary: "#dc2626", secondary: "#fff" },
          },
        }}
      />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* Accueil */}
          <Route path="/" element={<Home />} />

          {/* Auth */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Commun connecté */}
          <Route path="/profil"        element={<Profil />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ajouter-photo" element={<AddPhoto />} />
          <Route path="/attente-validation" element={<AttenteValidation />} />

          {/* Passager */}
          <Route path="/recherche"        element={<Recherche />} />
          <Route path="/mes-reservations" element={<MesReservations />} />

          {/* Chauffeur */}
          <Route path="/mes-trajets"     element={<MesTrajets />} />
          <Route path="/demandes-recues" element={<DemandesRecues />} />
          <Route path="/publier"         element={<Publier />} />
          <Route path="/mon-vehicule"    element={<MonVehicule />} />
          <Route path="/portefeuille"    element={<Portefeuille />} />
          <Route path="/mes-evaluations" element={<EvaluationsRecues />} />

          {/* Admin — toutes les sous-sections gérées en interne */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;