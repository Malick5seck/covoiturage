export default function Footer() {
  return (
    <footer className="bg-gainde-dark text-white py-6 px-4 text-center mt-auto w-full">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm md:text-base font-medium">
          © {new Date().getFullYear()} — Warr Gaïndé
        </p>

        <p className="text-xs text-gray-400 mt-1">
          Covoiturage interurbain au Sénégal — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}