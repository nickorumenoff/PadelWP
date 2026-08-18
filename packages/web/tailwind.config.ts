import type { Config } from "tailwindcss";

/**
 * Paleta de marca Padel WP: azul, verde y blanco, con el blanco como color
 * predominante para transmitir una imagen limpia y elegante. El azul se usa
 * para navegación/acciones principales y el verde (color de cancha) como
 * acento para estados positivos y llamadas a la acción secundarias.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        mist: "#F5F8FA",
        ink: "#111827",
        muted: "#6B7280",
        line: "#E5E9EC",
        brand: {
          blue: "#0F3D5C",
          "blue-light": "#1E6091",
          "blue-50": "#EAF1F6",
          green: "#2F9E63",
          "green-light": "#DCF3E6",
          "green-dark": "#1F7A4C",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 61, 92, 0.06), 0 4px 16px rgba(15, 61, 92, 0.06)",
        card: "0 2px 8px rgba(15, 61, 92, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
