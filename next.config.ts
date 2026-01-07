import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Transpilamos estos paquetes para resolver problemas de ESM/CommonJS
  transpilePackages: ["open-factura"],
  // Mantenemos estos como externos para evitar problemas de bundling
  serverExternalPackages: [
    "xmldom",
    "xpath",
    "@xmldom/xmldom",
    "node-forge",
    "xml-crypto",
  ],
};

export default nextConfig;
