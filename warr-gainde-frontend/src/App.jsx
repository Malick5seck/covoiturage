import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

// Pages auth
import Login    from "./pages/Login";
import Register from "./pages/Register";

// Pages communes
import Home          from "./pages/Home";
import Recherche     from "./pages/Recherche";
import Profil        from "./pages/Profil";
import Notifications from "./pages/Notifications";
import AddPhoto      from "./components/AddPhoto";
import AttenteValidation from "./pages/AttenteValidation";

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
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* Accueil */}
          <Route path="/" element={<Home />} />

          {/* Auth */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

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
