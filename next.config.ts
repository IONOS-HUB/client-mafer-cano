import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Forzamos a Next.js a no tocar NADA relacionado con la firma electrónica
  serverExternalPackages: [
    "open-factura",
    "xmldom",
    "xpath",
    "@xmldom/xmldom",
    "node-forge",
    "xml-crypto",
  ],
};

export default nextConfig;
