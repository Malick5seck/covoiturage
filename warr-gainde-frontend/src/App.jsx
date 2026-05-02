import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

// Importation des pages réelles
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Recherche from "./pages/Recherche";
import Publier from "./pages/Publier";
import Dashboard from "./pages/Dashboard";
import AddPhoto from "./components/AddPhoto";
import Profil from "./pages/Profil";
import AttenteValidation from "./pages/AttenteValidation"; // ← gardé
import AdminDashboard from "./pages/AdminDashboard";
import MonVehicule from "./pages/MonVehicule"; // ← gardé
import Notifications from "./pages/Notifications";
import Portefeuille from "./pages/Portefeuille";

function App() {
  return (
    <BrowserRouter>
      {/* La Navbar reste visible sur toutes les pages */}
      <Navbar />

      {/* Conteneur principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* Route d'accueil unique pointant vers le vrai Home */}
          <Route path="/" element={<Home />} />

          {/* Authentification */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Fonctionnalités de l'application */}
          <Route path="/recherche" element={<Recherche />} />
          <Route path="/publier" element={<Publier />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/mon-vehicule" element={<MonVehicule />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/portefeuille" element={<Portefeuille />} />

          {/* Page spécifique pour la validation des chauffeurs */}
          <Route path="/attente-validation" element={<AttenteValidation />} />

          {/* Ajouter photo (déplacé avant la route * pour clarté) */}
          <Route path="/ajouter-photo" element={<AddPhoto />} />

          {/* Redirection automatique si la route n'existe pas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
