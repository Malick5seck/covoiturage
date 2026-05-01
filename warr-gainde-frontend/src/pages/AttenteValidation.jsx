// src/pages/AttenteValidation.jsx
import React from "react";

const AttenteValidation = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Compte en attente de validation
        </h1>
        <p className="text-gray-600">
          Votre inscription en tant que conducteur est en cours d’examen par
          notre équipe. Vous recevrez une notification dès qu’elle sera
          approuvée.
        </p>
        <p className="mt-4 text-sm text-gray-400">Merci de votre patience.</p>
      </div>
    </div>
  );
};

export default AttenteValidation;