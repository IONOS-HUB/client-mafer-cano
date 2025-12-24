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
    obligadoContabilidad: "SI" | "NO";
    tipoIdentificacionComprador: string;
    razonSocialComprador?: string;
    identificacionComprador: string;
    totalSinImpuestos: number;
    totalDescuento: number;
    totalImpuestos: Array<{
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

export const sriService = {
  /**
   * Genera los datos de la factura en formato SRI
   */
  generateInvoiceData(
    sale: Sale,
    companyInfo: SRICompanyInfo,
    customerData?: CustomerData
  ): InvoiceData {
    const invoiceNumber = sale.invoice_number || "";
    const parts = invoiceNumber.split("-");
    const secuencial = parts.length === 3 ? parts[2] : "000000001";

    // Calcular totales
    // El total de la venta ya incluye IVA, así que calculamos el subtotal sin IVA
    const total = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
    const ivaRate = 0.15; // IVA 15% en Ecuador
    const subtotal = total / (1 + ivaRate); // Subtotal sin IVA
    const iva = total - subtotal;

    // Generar fecha en formato requerido (YYYY-MM-DD)
    const fechaEmision = new Date(sale.created_at || new Date())
      .toISOString()
      .split("T")[0];

    // Mapear items a formato SRI
    // Cada item tiene un subtotal que incluye IVA, necesitamos calcular sin IVA
    const detalles: InvoiceItem[] = sale.items.map((item) => {
      const descripcion =
        item.product?.description || item.service?.description || "Item";
      const cantidad = item.quantity;
      // El precio unitario ya incluye IVA, calcular sin IVA
      const precioUnitarioConIva = item.unitPrice;
      const precioUnitarioSinIva = precioUnitarioConIva / (1 + ivaRate);
      const precioTotalSinImpuesto = precioUnitarioSinIva * cantidad;
      const ivaItem = item.subtotal - precioTotalSinImpuesto;

      return {
        codigoPrincipal: item.product?.barcode || item.service?.id || "",
        descripcion,
        cantidad,
        precioUnitario: precioUnitarioSinIva,
        precioTotalSinImpuesto,
        impuestos: [
          {
            codigo: "2", // IVA
            codigoPorcentaje: "2", // 15%
            tarifa: 15,
            baseImponible: precioTotalSinImpuesto,
            valor: ivaItem,
          },
        ],
      };
    });

    // Mapear tipo de identificación del comprador
    let tipoIdentificacionComprador = "07"; // Consumidor final por defecto
    if (customerData) {
      switch (customerData.identification_type) {
        case "ruc":
          tipoIdentificacionComprador = "04";
          break;
        case "cedula":
          tipoIdentificacionComprador = "05";
          break;
        case "passport":
          tipoIdentificacionComprador = "06";
          break;
      }
    }

    // Mapear forma de pago
    let formaPago = "01"; // Sin utilización del sistema financiero
    switch (sale.payment_method) {
      case "cash":
        formaPago = "01";
        break;
      case "card":
        formaPago = "19"; // Tarjeta de débito
        break;
      case "transfer":
        formaPago = "20"; // Transferencia
        break;
    }

    const invoiceData: InvoiceData = {
      infoTributaria: {
        ambiente: companyInfo.ambiente,
        tipoEmision: "1", // Normal
        razonSocial: companyInfo.razonSocial,
        nombreComercial: companyInfo.nombreComercial,
        ruc: companyInfo.ruc,
        codDoc: companyInfo.codDoc,
        estab: companyInfo.establecimiento,
        ptoEmi: companyInfo.puntoEmision,
        secuencial,
        dirMatriz: companyInfo.direccionMatriz,
      },
      infoFactura: {
        fechaEmision,
        dirEstablecimiento: companyInfo.direccionMatriz,
        obligadoContabilidad: "NO",
        tipoIdentificacionComprador,
        razonSocialComprador:
          customerData?.business_name || customerData?.name || "",
        identificacionComprador:
          customerData?.identification || "9999999999999",
        totalSinImpuestos: subtotal,
        totalDescuento: 0,
        totalImpuestos: [
          {
            codigo: "2",
            codigoPorcentaje: "2",
            baseImponible: subtotal,
            tarifa: 15,
            valor: iva,
          },
        ],
        importeTotal: total,
        moneda: "USD",
        pagos: [
          {
            formaPago,
            total,
          },
        ],
      },
      detalles: {
        detalle: detalles,
      },
    };

    return invoiceData;
  },

  /**
   * Envía la factura al SRI a través de la API
   */
  async sendInvoiceToSRI(
    saleId: string,
    invoiceData: InvoiceData
  ): Promise<SRIIssueResult> {
    try {
      const response = await fetch("/api/sri/send-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saleId,
          invoiceData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          errorMessage: error.message || "Error al enviar factura al SRI",
        };
      }

      const result = await response.json();
      console.log("Respuesta de la API SRI:", result);
      
      return {
        success: true,
        accessKey: result.accessKey || undefined,
        authorizationNumber: result.authorizationNumber || undefined,
        errorMessage: result.error ? result.error : undefined,
      };
    } catch (error) {
      console.error("Error sending invoice to SRI:", error);
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
};

