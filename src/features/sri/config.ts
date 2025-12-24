import { SRICompanyInfo } from "./types";

/**
 * Obtiene la configuración de la empresa para facturación electrónica
 * Las variables deben estar configuradas en .env.local
 */
export function getSRICompanyInfo(): SRICompanyInfo | null {
  // Verificar si las variables requeridas están configuradas
  const ruc = process.env.NEXT_PUBLIC_SRI_RUC;
  const razonSocial = process.env.NEXT_PUBLIC_SRI_RAZON_SOCIAL;
  const direccionMatriz = process.env.NEXT_PUBLIC_SRI_DIRECCION_MATRIZ;
  const establecimiento = process.env.NEXT_PUBLIC_SRI_ESTABLECIMIENTO || "001";
  const puntoEmision = process.env.NEXT_PUBLIC_SRI_PUNTO_EMISION || "001";
  const ambiente = process.env.NEXT_PUBLIC_SRI_AMBIENTE || "1"; // "1" = pruebas, "2" = producción

  if (!ruc || !razonSocial || !direccionMatriz) {
    console.warn(
      "Configuración del SRI incompleta. Verifique las variables de entorno."
    );
    return null;
  }

  return {
    ruc,
    razonSocial,
    nombreComercial: process.env.NEXT_PUBLIC_SRI_NOMBRE_COMERCIAL,
    direccionMatriz,
    establecimiento,
    puntoEmision,
    codDoc: "01", // 01 = Factura
    ambiente: ambiente === "2" ? "2" : "1",
  };
}

/**
 * Verifica si la facturación electrónica está habilitada
 */
export function isSRIEnabled(): boolean {
  const hasCertificate = !!(process.env.SRI_P12_URL || process.env.SRI_P12_PATH);
  return (
    hasCertificate &&
    !!process.env.SRI_P12_PASSWORD &&
    !!process.env.NEXT_PUBLIC_SRI_RUC &&
    !!process.env.NEXT_PUBLIC_SRI_RAZON_SOCIAL
  );
}

