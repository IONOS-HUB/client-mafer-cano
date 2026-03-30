import { Sale } from "../pos/types";
import { CustomerData } from "../pos/invoice-types";
import { SRICompanyInfo, SRIIssueResult } from "./types";

interface InvoiceItem {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  precioTotalSinImpuesto: number;
  impuestos: Array<{
    codigo: string;
    codigoPorcentaje: string;
    tarifa: number;
    baseImponible: number;
    valor: number;
  }>;
}

interface InvoiceData {
  infoTributaria: {
    ambiente: string;
    tipoEmision: string;
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    claveAcceso?: string;
    codDoc: string;
    estab: string;
    ptoEmi: string;
    secuencial: string;
    dirMatriz: string;
  };
  infoFactura: {
    fechaEmision: string;
    dirEstablecimiento: string;
    obligadoContabilidad: "NO" | "SI";
    tipoIdentificacionComprador: string;
    razonSocialComprador?: string;
    identificacionComprador: string;
    totalSinImpuestos: number;
    totalDescuento: number;
    totalConImpuestos: Array<{
      codigo: string;
      codigoPorcentaje: string;
      baseImponible: number;
      tarifa: number;
      valor: number;
    }>;
    importeTotal: number;
    moneda: string;
    pagos?: Array<{
      formaPago: string;
      total: number;
      plazo?: string;
      unidadTiempo?: string;
    }>;
  };
  detalles: {
    detalle: InvoiceItem[];
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const sriService = {
  /**
   * Redondeo estricto a 2 decimales para evitar rechazos del SRI
   */
  round(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  },

  /**
   * Obtiene el código de porcentaje según el IVA rate
   * Según el SRI de Ecuador:
   * - 0%: código "0"
   * - 12%: código "2"
   * - 14%: código "6"
   * - 15%: código "4" (más común)
   * - 8%: código "7"
   * Por defecto, para 15% o valores no reconocidos, retorna "4"
   */
  getIvaCodePorcentaje(ivaRate: number): string {
    const percentage = Math.round(ivaRate * 100);
    switch (percentage) {
      case 0:
        return "0";
      case 12:
        return "2";
      case 14:
        return "6";
      case 15:
        return "4";
      case 8:
        return "7";
      default:
        // Por defecto, usar código para 15% si no se reconoce
        return "4";
    }
  },

  /**
   * Genera los datos con el formato exacto que espera el esquema Off-line del SRI
   */
  generateInvoiceData(
    sale: Sale,
    companyInfo: SRICompanyInfo,
    customerData?: CustomerData,
    ivaRate: number = 0.15
  ): InvoiceData {
    // 1. Padding de Secuencial (9 dígitos), Establecimiento (3) y Punto Emisión (3)
    const invoiceNumber = sale.invoice_number || "";
    const parts = invoiceNumber.split("-");
    const secuencialRaw = parts.length === 3 ? parts[2] : "1";
    const secuencial = secuencialRaw.padStart(9, "0");
    const estab = companyInfo.establecimiento.padStart(3, "0");
    const ptoEmi = companyInfo.puntoEmision.padStart(3, "0");

    // 2. Cálculo de Totales con Redondeo a 2 decimales
    const total = this.round(
      sale.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
    );
    // IVA rate is passed as parameter (default 0.15 = 15%)
    const subtotal = this.round(total / (1 + ivaRate));
    const iva = this.round(total - subtotal);

    // 3. Formato de Fecha DD/MM/YYYY (Estándar para Clave de Acceso)
    // DENTRO DE generateInvoiceData en sriService.ts

    // Aseguramos que la fecha sea un objeto Date válido
    const dateObj = sale.created_at ? new Date(sale.created_at) : new Date();

    // Si por alguna razón la fecha sigue siendo inválida, usamos la fecha actual
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

    const day = String(validDate.getDate()).padStart(2, "0");
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const year = String(validDate.getFullYear());

    // El SRI espera DD/MM/YYYY para la clave de acceso,
    // pero algunas versiones de la librería prefieren el string directo
    const fechaEmision = `${day}/${month}/${year}`;
    // 4. Mapeo de Items (Detalles)
    const detalles: InvoiceItem[] = sale.items.map((item) => {
      const cantidad = item.quantity;
      const precioUnitarioSinIva = this.round(item.unitPrice / (1 + ivaRate));
      const precioTotalSinImpuesto = this.round(
        precioUnitarioSinIva * cantidad
      );
      const ivaItem = this.round((item.subtotal || 0) - precioTotalSinImpuesto);

      return {
        codigoPrincipal: (
          item.product?.barcode ||
          item.service?.id ||
          "001"
        ).substring(0, 25),
        descripcion: (
          item.product?.description ||
          item.service?.description ||
          "Producto"
        ).substring(0, 300),
        cantidad: cantidad,
        precioUnitario: precioUnitarioSinIva,
        precioTotalSinImpuesto: precioTotalSinImpuesto,
        impuestos: [
          {
            codigo: "2", // Impuesto IVA
            codigoPorcentaje: this.getIvaCodePorcentaje(ivaRate), // Código según porcentaje de IVA
            tarifa: Math.round(ivaRate * 100), // Convertir a porcentaje
            baseImponible: precioTotalSinImpuesto,
            valor: ivaItem,
          },
        ],
      };
    });

    // 5. Mapeo de Comprador
    let tipoIdentificacionComprador = "07";
    if (customerData) {
      if (customerData.identification_type === "ruc")
        tipoIdentificacionComprador = "04";
      else if (customerData.identification_type === "cedula")
        tipoIdentificacionComprador = "05";
      else if (customerData.identification_type === "passport")
        tipoIdentificacionComprador = "06";
    }

    // 6. Formas de Pago
    let formaPago = "01"; // Sin sistema financiero
    if (sale.payment_method === "card") formaPago = "19";
    else if (sale.payment_method === "transfer") formaPago = "20";

    return {
      infoTributaria: {
        ambiente: companyInfo.ambiente,
        tipoEmision: "1",
        razonSocial: companyInfo.razonSocial.substring(0, 300),
        nombreComercial: (
          companyInfo.nombreComercial || companyInfo.razonSocial
        ).substring(0, 300),
        ruc: companyInfo.ruc,
        codDoc: "01",
        estab,
        ptoEmi,
        secuencial,
        dirMatriz: companyInfo.direccionMatriz.substring(0, 300),
      },
      infoFactura: {
        fechaEmision,
        dirEstablecimiento: companyInfo.direccionMatriz.substring(0, 300),
        obligadoContabilidad: "NO" as const,
        tipoIdentificacionComprador,  
        razonSocialComprador: (
          customerData?.business_name ||
          customerData?.name ||
          "CONSUMIDOR FINAL"
        ).substring(0, 300),
        identificacionComprador:
          customerData?.identification || "9999999999999",
        totalSinImpuestos: subtotal,
        totalDescuento: 0,
        totalConImpuestos: [
          {
            codigo: "2",
            codigoPorcentaje: this.getIvaCodePorcentaje(ivaRate), // Código según porcentaje de IVA
            baseImponible: subtotal,
            tarifa: Math.round(ivaRate * 100), // Convertir a porcentaje
            valor: iva,
          },
        ],
        importeTotal: total,
        moneda: "USD",
        pagos: [{ formaPago, total }],
      },
      detalles: { detalle: detalles },
    };
  },

  /**
   * Consulta el estado de autorización de una factura ya enviada al SRI.
   */
  async checkAuthorization(accessKey: string): Promise<{
    authorizationNumber?: string;
    authorizationStatus?: string;
  }> {
    const response = await fetch("/api/sri/check-authorization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey }),
    });
    const result: unknown = await response.json();
    const r = isRecord(result) ? result : {};
    return {
      authorizationNumber: typeof r.authorizationNumber === "string" ? r.authorizationNumber : undefined,
      authorizationStatus: typeof r.authorizationStatus === "string" ? r.authorizationStatus : undefined,
    };
  },

  /**
   * Reintenta obtener la autorización SRI en background (fire-and-forget).
   * Actualiza Supabase cuando el SRI autoriza la factura.
   * Se llama después de que una venta queda en estado "sent".
   */
  retryAuthorizationInBackground(
    saleId: string,
    accessKey: string,
    onAuthorized?: (authorizationNumber: string) => void
  ): void {
    // Intervalos de espera en ms: 5s, 10s, 15s, 20s, 30s, 60s, 60s, 60s
    const delays = [5000, 10000, 15000, 20000, 30000, 60000, 60000, 60000];

    const attempt = async (index: number) => {
      if (index >= delays.length) {
        console.warn(`[SRI retry] Se agotaron los reintentos para venta ${saleId}`);
        return;
      }

      await new Promise((r) => setTimeout(r, delays[index]));

      try {
        console.log(`[SRI retry] Intento ${index + 1}/${delays.length} para venta ${saleId}...`);
        const { authorizationNumber } = await this.checkAuthorization(accessKey);

        if (authorizationNumber) {
          console.log(`[SRI retry] ✅ Autorizado: ${authorizationNumber}`);

          // Actualizar Supabase con el número de autorización
          const { supabaseBrowser } = await import("@/lib/supabase/client");
          await supabaseBrowser
            .from("sales")
            .update({
              sri_authorization_number: authorizationNumber,
              sri_status: "authorized",
              sri_authorized_at: new Date().toISOString(),
            })
            .eq("id", saleId);

          onAuthorized?.(authorizationNumber);
        } else {
          // No autorizado aún, seguir reintentando
          attempt(index + 1);
        }
      } catch (err) {
        console.error(`[SRI retry] Error en intento ${index + 1}:`, err);
        attempt(index + 1);
      }
    };

    // Lanzar sin await (fire and forget)
    attempt(0);
  },

  async sendInvoiceToSRI(
    saleId: string,
    invoiceData: InvoiceData
  ): Promise<SRIIssueResult> {
    try {
      const response = await fetch("/api/sri/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, invoiceData }),
      });

      const result: unknown = await response.json();
      const r = isRecord(result) ? result : {};

      const message =
        typeof r.message === "string"
          ? r.message
          : typeof r.error === "string"
          ? r.error
          : "Error en servidor SRI";

      if (!response.ok) {
        return { success: false, errorMessage: message };
      }

      return {
        success: typeof r.success === "boolean" ? r.success : true,
        accessKey: typeof r.accessKey === "string" ? r.accessKey : undefined,
        authorizationNumber:
          typeof r.authorizationNumber === "string"
            ? r.authorizationNumber
            : undefined,
        errorMessage: typeof r.error === "string" ? r.error : undefined,
      };
    } catch (error) {
      console.error("Error sending invoice to SRI:", error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Error de red",
      };
    }
  },
};
