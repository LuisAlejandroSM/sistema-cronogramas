/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Las fotos de formularios se comprimen en el celular (~300 KB) y se suben de a una;
      // 4 MB deja margen sobre el máximo aceptado por foto (3 MB, ver almacenamiento.js).
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
