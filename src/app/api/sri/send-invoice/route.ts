import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SriAutorizacion {
  estado?: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  comprobante?: string;
  mensajes?: unknown;
}

interface SriAuthorizationResponse {
  RespuestaAutorizacionComprobante?: {
    claveAccesoConsultada?: string;
    numeroComprobantes?: string;
    autorizaciones?: {
      autorizacion?: SriAutorizacion | SriAutorizacion[];
    };
  };
  estado?: string;
  numeroAutorizacion?: string;
}

type Json = Record<string, unknown>;

type DomGlobals = {
  DOMParser?: unknown;
  XMLSerializer?: unknown;
};

type OpenFacturaModule = {
  generateInvoice: (data: unknown) => { invoice: unknown };
  generateInvoiceXml: (invoice: unknown) => string;
  getP12FromUrl: (url?: string) => Promise<ArrayBuffer>;
  documentReception: (signedXml: string, wsdlUrl: string) => Promise<unknown>;
  documentAuthorization: (
    accessKey: string,
    wsdlUrl: string
  ) => Promise<unknown>;
};

/**
 * Rellena con caracteres a la izquierda hasta alcanzar la longitud deseada
 */
function padLeft(value: string, len: number, ch = "0") {
  return String(value ?? "").padStart(len, ch);
}

/**
 * Valida si un valor es un objeto (Record)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Extrae el mensaje de error de un objeto desconocido
 */
function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Formatea una fecha DD/MM/YYYY a DDMMYYYY
 */
function formatDdMmYyyyToDdMmYyyyNoSlash(fecha: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fecha ?? ""));
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${dd}${mm}${yyyy}`;
}

/**
 * Algoritmo Módulo 11 para el dígito verificador de la clave de acceso SRI
 */
function modulo11(clave48: string) {
  let sum = 0;
  let weight = 2;
  for (let i = clave48.length - 1; i >= 0; i--) {
    sum += Number(clave48[i]) * weight;
    weight++;
    if (weight > 7) weight = 2;
  }
  const mod = sum % 11;
  const dig = 11 - mod;
  if (dig === 11) return "0";
  if (dig === 10) return "1";
  return String(dig);
}

/**
 * Genera la clave de acceso de 49 dígitos requerida por el SRI
 */
function makeAccessKeySRI(params: {
  fechaEmision: string;
  codDoc: string;
  ruc: string;
  ambiente: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  tipoEmision: string;
  codigoNumerico?: string;
}) {
  const fecha = formatDdMmYyyyToDdMmYyyyNoSlash(params.fechaEmision);
  if (!fecha) return null;

  const codigoNumerico = padLeft(
    params.codigoNumerico ?? String(Math.floor(Math.random() * 1e8)),
    8
  );
  const ruc = padLeft(params.ruc, 13);
  const estab = padLeft(params.estab, 3);
  const ptoEmi = padLeft(params.ptoEmi, 3);
  const secuencial = padLeft(params.secuencial, 9);

  const clave48 =
    fecha +
    padLeft(params.codDoc, 2) +
    ruc +
    padLeft(params.ambiente, 1) +
    estab +
    ptoEmi +
    secuencial +
    codigoNumerico +
    padLeft(params.tipoEmision, 1);

  const dv = modulo11(clave48);
  return clave48 + dv; // 49
}

/**
 * Limpia el BOM y normaliza saltos de línea del XML
 */
function stripBomAndNormalize(xml: string) {
  return String(xml ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

/**
 * Asegura que los hijos de <pagos> estén envueltos en un tag <pago> si falta
 */
function ensurePagosHasPago(xml: string) {
  const re = /<pagos>([\s\S]*?)<\/pagos>/g;
  if (!re.test(xml)) return { xml, changed: false, reason: "no <pagos>" };

  let changed = false;

  const out = xml.replace(re, (full, inner) => {
    if (/<pago>[\s\S]*?<\/pago>/.test(inner)) return full;

    const trimmed = String(inner ?? "").trim();
    if (!trimmed) return full;

    changed = true;
    return `<pagos>\n      <pago>${inner}</pago>\n    </pagos>`;
  });

  return {
    xml: out,
    changed,
    reason: changed ? "wrapped <pagos> children into <pago>" : "already ok",
  };
}

/**
 * Normaliza el atributo ID del tag raíz a id="comprobante" (minúscula)
 */
function ensureRootHasLowercaseIdOnly(xml: string) {
  const start = xml.indexOf("<factura");
  if (start === -1)
    return { xml, changed: false, reason: "no <factura found", rootTag: "" };

  const end = xml.indexOf(">", start);
  if (end === -1)
    return { xml, changed: false, reason: "no > for root tag", rootTag: "" };

  let rootTag = xml.slice(start, end + 1);
  const before = rootTag;

  // 1) Eliminar cualquier Id="..." (SRI NO lo permite)
  rootTag = rootTag.replace(/\sId=(["']).*?\1/g, "");

  // 2) Normalizar: si existe id='comprobante' -> id="comprobante"
  rootTag = rootTag.replace(
    /(\s)id=(["'])comprobante\2/i,
    `$1id="comprobante"`
  );

  // 3) Si no existe id="comprobante", insertarlo antes de >
  if (!/(\s)id="comprobante"/i.test(rootTag)) {
    rootTag = rootTag.replace(/>$/, ` id="comprobante">`);
  }

  // 4) Si por alguna razón quedó duplicado, deja uno
  rootTag = rootTag.replace(/\sid="(?!comprobante")[^"]*"/gi, "");

  const out = xml.slice(0, start) + rootTag + xml.slice(end + 1);

  return {
    xml: out,
    changed: before !== rootTag,
    reason:
      before !== rootTag ? "normalized to lowercase id only" : "already ok",
    rootTag,
  };
}

/**
 * Prepara el XML eliminando namespaces e IDs mixtos para el firmador
 */
function normalizeXmlForSriSigner(xml: string) {
  const start = xml.indexOf("<factura");
  if (start === -1) return xml;

  const end = xml.indexOf(">", start);
  if (end === -1) return xml;

  let rootTag = xml.slice(start, end + 1);

  // 1) Elimina namespaces para evitar conflictos con el firmador
  rootTag = rootTag.replace(/\sxmlns(:\w+)?=(["']).*?\2/g, "");

  // 2) EL CAMBIO CLAVE: Quitar id/Id previos y forzar 'id' en minúscula
  rootTag = rootTag.replace(/\s(id|Id)=(["']).*?\2/g, "");

  // El SRI solo acepta id="comprobante"
  rootTag = rootTag.replace(/>$/, ` id="comprobante">`);

  return xml.slice(0, start) + rootTag + xml.slice(end + 1);
}

/**
 * Inyecta DOM globals en el entorno Node para compatibilidad con librerías XML
 */
async function ensureXmlDomGlobals() {
  const g = globalThis as unknown as DomGlobals;

  if (g.DOMParser && g.XMLSerializer) return;

  const xmldom = await import("@xmldom/xmldom");

  g.DOMParser =
    g.DOMParser ?? (xmldom as unknown as { DOMParser: unknown }).DOMParser;
  g.XMLSerializer =
    g.XMLSerializer ??
    (xmldom as unknown as { XMLSerializer: unknown }).XMLSerializer;

  console.log("[SRI] XML DOM globals set via @xmldom/xmldom");
}

/**
 * Reemplaza el contenido de un tag específico
 */
function setXmlTagValue(xml: string, tag: string, value: string) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  if (re.test(xml)) return xml.replace(re, `<${tag}>${value}</${tag}>`);
  return xml;
}

/**
 * Garantiza que claveAcceso exista y esté ubicada antes de codDoc (Orden XSD)
 */
function ensureClaveAccesoBeforeCodDoc(xml: string, accessKey: string) {
  const m = /<infoTributaria>([\s\S]*?)<\/infoTributaria>/.exec(xml);
  if (!m) return { xml, changed: false, reason: "no <infoTributaria>" };

  let inner = m[1];
  const before = inner;

  inner = inner.replace(/<claveAcceso>[\s\S]*?<\/claveAcceso>\s*/g, "");

  if (/<codDoc>/.test(inner)) {
    inner = inner.replace(
      /<codDoc>/,
      `<claveAcceso>${accessKey}</claveAcceso>\n    <codDoc>`
    );
  } else {
    inner = inner + `\n    <claveAcceso>${accessKey}</claveAcceso>\n`;
  }

  const out = xml.replace(m[0], `<infoTributaria>${inner}</infoTributaria>`);
  return {
    xml: out,
    changed: inner !== before,
    reason: "claveAcceso placed before codDoc",
  };
}

/**
 * Renombra totalImpuestos a totalConImpuestos según esquema SRI
 */
function ensureTotalConImpuestosTag(xml: string) {
  const m = /<infoFactura>([\s\S]*?)<\/infoFactura>/.exec(xml);
  if (!m) return { xml, changed: false, reason: "no <infoFactura>" };

  let inner = m[1];
  const before = inner;

  inner = inner
    .replace(/<totalImpuestos>/g, "<totalConImpuestos>")
    .replace(/<\/totalImpuestos>/g, "</totalConImpuestos>");

  const out = xml.replace(m[0], `<infoFactura>${inner}</infoFactura>`);
  return {
    xml: out,
    changed: inner !== before,
    reason: "totalImpuestos renamed to totalConImpuestos",
  };
}

/**
 * Asegura que los hijos de totalConImpuestos estén envueltos en totalImpuesto
 */
function ensureTotalConImpuestosHasTotalImpuesto(xml: string) {
  const re = /<totalConImpuestos>([\s\S]*?)<\/totalConImpuestos>/g;
  if (!re.test(xml))
    return { xml, changed: false, reason: "no <totalConImpuestos>" };

  let changed = false;

  const out = xml.replace(re, (full, inner) => {
    if (/<totalImpuesto>[\s\S]*?<\/totalImpuesto>/.test(inner)) return full;

    const trimmed = String(inner ?? "").trim();
    if (trimmed.length > 0) {
      changed = true;
      return `<totalConImpuestos>\n      <totalImpuesto>${inner}</totalImpuesto>\n    </totalConImpuestos>`;
    }

    return full;
  });

  return {
    xml: out,
    changed,
    reason: changed
      ? "wrapped totalConImpuestos children into totalImpuesto"
      : "already ok",
  };
}

/**
 * Inserta el tag <descuento>0.00</descuento> si falta en los detalles (Orden XSD)
 */
function ensureDetalleHasDescuentoBeforePrecioTotal(xml: string) {
  const reDetalle = /<detalle>([\s\S]*?)<\/detalle>/g;
  if (!reDetalle.test(xml))
    return { xml, changed: false, reason: "no <detalle>" };

  let changed = false;

  const out = xml.replace(reDetalle, (full, inner) => {
    if (!/<precioTotalSinImpuesto>/.test(inner)) return full;
    if (/<descuento>[\s\S]*?<\/descuento>/.test(inner)) return full;
    if (/<precioSinSubsidio>[\s\S]*?<\/precioSinSubsidio>/.test(inner))
      return full;

    changed = true;
    const patchedInner = inner.replace(
      /<precioTotalSinImpuesto>/,
      `<descuento>0.00</descuento>\n      <precioTotalSinImpuesto>`
    );

    return `<detalle>${patchedInner}</detalle>`;
  });

  return {
    xml: out,
    changed,
    reason: changed
      ? "inserted <descuento>0.00</descuento> before precioTotalSinImpuesto"
      : "already ok",
  };
}

/**
 * Asegura la estructura <impuestos><impuesto>...</impuesto></impuestos> en el detalle
 */
function ensureDetalleImpuestosHasImpuesto(xml: string) {
  const re = /<impuestos>([\s\S]*?)<\/impuestos>/g;
  if (!re.test(xml)) return { xml, changed: false, reason: "no <impuestos>" };

  let changed = false;

  const out = xml.replace(re, (full, inner) => {
    if (/<impuesto>[\s\S]*?<\/impuesto>/.test(inner)) return full;

    const trimmed = String(inner ?? "").trim();
    if (!trimmed) return full;

    changed = true;
    return `<impuestos>\n        <impuesto>${inner}</impuesto>\n      </impuestos>`;
  });

  return {
    xml: out,
    changed,
    reason: changed
      ? "wrapped <impuestos> children into <impuesto>"
      : "already ok",
  };
}

/**
 * Orquestador de parches de XML para cumplir con el XSD del SRI
 */
function patchSriXmlBeforeSign(
  xml: string,
  accessKey: string,
  fechaEmision: string
) {
  let out = xml;

  out = setXmlTagValue(out, "fechaEmision", fechaEmision);
  out = ensureClaveAccesoBeforeCodDoc(out, accessKey).xml;
  out = ensureTotalConImpuestosTag(out).xml;
  out = ensureTotalConImpuestosHasTotalImpuesto(out).xml;
  out = ensurePagosHasPago(out).xml;
  out = ensureDetalleHasDescuentoBeforePrecioTotal(out).xml;
  out = ensureDetalleImpuestosHasImpuesto(out).xml;

  return out;
}

/* -------------------------------------------------------------------------- */
/* MAIN HANDLER                                 */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  const ok = (payload: Json, status = 200) =>
    NextResponse.json(
      { ...payload, ts: new Date().toISOString(), ms: Date.now() - startedAt },
      { status }
    );

  const fail = (status: number, payload: Json) =>
    NextResponse.json(
      {
        success: false,
        ...payload,
        ts: new Date().toISOString(),
        ms: Date.now() - startedAt,
      },
      { status }
    );

  try {
    /* 1) Obtener y validar Body */
    let body: unknown;
    try {
      body = await request.json();
    } catch (e: unknown) {
      console.error("[SRI] ❌ JSON inválido:", e);
      return fail(400, {
        step: "parseBody",
        error: "JSON inválido",
        message: errorMessage(e),
      });
    }

    const invoiceData = isRecord(body) ? body.invoiceData : undefined;
    if (!invoiceData || !isRecord(invoiceData)) {
      return fail(400, {
        step: "validateInput",
        error: "invoiceData es requerido",
      });
    }

    /* 2) Configurar Variables de Entorno */
    const p12Url = process.env.SRI_P12_URL;
    const p12Path = process.env.SRI_P12_PATH;
    const p12Password = process.env.SRI_P12_PASSWORD;

    const receptionUrl =
      process.env.SRI_RECEPTION_URL ||
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl";
    const authorizationUrl =
      process.env.SRI_AUTHORIZATION_URL ||
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl";

    console.log("[SRI] env:", {
      hasP12Url: Boolean(p12Url),
      hasP12Path: Boolean(p12Path),
      hasP12Password: Boolean(p12Password),
      receptionUrl,
      authorizationUrl,
    });

    if ((!p12Url && !p12Path) || !p12Password) {
      return fail(500, {
        step: "env",
        error: "Configuración del SRI incompleta en el servidor (.env)",
      });
    }

    /* 3) Preparar entorno DOM */
    await ensureXmlDomGlobals();

    /* 4) Importar librería open-factura */
    const facturaLib = (await import(
      "open-factura"
    )) as unknown as OpenFacturaModule;

    const {
      generateInvoice,
      generateInvoiceXml,
      getP12FromUrl,
      documentReception,
      documentAuthorization,
    } = facturaLib;

    /* 5) Cargar Certificado P12 */
    let signatureP12: Buffer;

    try {
      if (p12Path) {
        const filePath = join(process.cwd(), p12Path);
        console.log("[SRI] Leyendo certificado:", filePath);

        const fileBuffer = await readFile(filePath);
        signatureP12 = fileBuffer;

        console.log("[SRI] Certificado OK (bytes):", fileBuffer.byteLength);
      } else {
        console.log("[SRI] Descargando certificado desde URL...");
        const ab = await getP12FromUrl(p12Url);
        signatureP12 = Buffer.from(new Uint8Array(ab));
        console.log(
          "[SRI] Certificado descargado OK (bytes):",
          signatureP12.byteLength
        );
      }
    } catch (err: unknown) {
      console.error("SRI] Error leyendo certificado:", err);
      return fail(500, {
        step: "readP12",
        error: "Error al leer certificado digital",
        message: errorMessage(err),
      });
    }

    /* 6) Validar fechaEmision */
    const infoFactura = isRecord(invoiceData.infoFactura)
      ? invoiceData.infoFactura
      : undefined;

    const fechaEmision = String(infoFactura?.fechaEmision ?? "");
    if (!/^(\d{2})\/(\d{2})\/(\d{4})$/.test(fechaEmision)) {
      return fail(400, {
        step: "validateFechaEmision",
        error: "fechaEmision inválida (esperado DD/MM/YYYY)",
        received: fechaEmision,
      });
    }
    console.log("[SRI] fechaEmision:", fechaEmision);

    /* 7) Generar Clave de Acceso SRI */
    const infoTrib = isRecord(invoiceData.infoTributaria)
      ? invoiceData.infoTributaria
      : undefined;

    const accessKeyManual = makeAccessKeySRI({
      fechaEmision,
      codDoc: String(infoTrib?.codDoc ?? ""),
      ruc: String(infoTrib?.ruc ?? ""),
      ambiente: String(infoTrib?.ambiente ?? ""),
      estab: String(infoTrib?.estab ?? ""),
      ptoEmi: String(infoTrib?.ptoEmi ?? ""),
      secuencial: String(infoTrib?.secuencial ?? ""),
      tipoEmision: String(infoTrib?.tipoEmision ?? ""),
    });

    if (!accessKeyManual) {
      return fail(400, {
        step: "accessKey",
        error: "No se pudo generar clave de acceso",
      });
    }

    const newInfoTrib: Record<string, unknown> = isRecord(
      invoiceData.infoTributaria
    )
      ? invoiceData.infoTributaria
      : {};
    newInfoTrib.claveAcceso = accessKeyManual;
    invoiceData.infoTributaria = newInfoTrib;

    const accessKey = accessKeyManual;
    console.log("[SRI] Clave:", accessKey);

    if (!accessKey || accessKey.length !== 49 || /NaN/.test(accessKey)) {
      return fail(400, {
        step: "accessKey",
        error: "Clave manual inválida",
        accessKey,
      });
    }

    /* 8) Generar XML Base */
    let invoiceXml: string;
    try {
      console.log("[SRI] generateInvoice...");
      const { invoice } = generateInvoice(invoiceData);

      console.log("[SRI] generateInvoiceXml(invoice)...");
      invoiceXml = generateInvoiceXml(invoice);
    } catch (e: unknown) {
      console.error("SRI] Error generando XML:", e);
      return fail(500, {
        step: "generateXml",
        error: "Error generando XML",
        message: errorMessage(e),
      });
    }

    invoiceXml = stripBomAndNormalize(invoiceXml);
    console.log("[SRI] invoiceXml length:", invoiceXml.length);

    if (
      !invoiceXml.includes("<factura") ||
      !invoiceXml.includes("</factura>")
    ) {
      return fail(500, {
        step: "xmlValidate",
        error: "XML no parece una factura completa (tag factura incompleta)",
      });
    }

    /* 9) Corregir tag Raíz (id="comprobante") */
    const fix = ensureRootHasLowercaseIdOnly(invoiceXml);
    invoiceXml = fix.xml;
    console.log("🛠️ [SRI] root id fix:", {
      changed: fix.changed,
      reason: fix.reason,
      rootTag: fix.rootTag,
    });

    /* 10) Ejecutar Parches Críticos SRI */
    invoiceXml = patchSriXmlBeforeSign(invoiceXml, accessKey, fechaEmision);

    /* 11) Firmar Documento */
    let signedXml: string;
    try {
      console.log("[SRI] signing (ec-sri-invoice-signer)...");

      const { signInvoiceXml } = await import("ec-sri-invoice-signer");

      const xmlToSign = normalizeXmlForSriSigner(invoiceXml);

      signedXml = signInvoiceXml(xmlToSign, signatureP12, {
        pkcs12Password: p12Password,
      });

      // Safety Fix: Asegurar id en minúscula post-firma
      if (signedXml.includes('Id="comprobante"')) {
        console.log("[SRI] Corrigiendo 'Id' a 'id' post-firma (Safety Fix)");
        signedXml = signedXml.replace('Id="comprobante"', 'id="comprobante"');
      }

      console.log("[SRI] XML firmado OK (ec-sri-invoice-signer)");
    } catch (e: unknown) {
      console.error("SRI] Firma (ec-sri-invoice-signer) falló:", e);
      return fail(500, {
        step: "signSriSigner",
        error: "Error al firmar XML (ec-sri-invoice-signer)",
        message: errorMessage(e),
      });
    }

    /* 12) Envío a Recepción SRI */
    console.log("📡 [SRI] Enviando a recepción...");
    let receptionResult: unknown;
    try {
      receptionResult = await documentReception(signedXml, receptionUrl);

      const rr = isRecord(receptionResult) ? receptionResult : {};
      const wrapped = isRecord(rr.RespuestaRecepcionComprobante)
        ? (rr.RespuestaRecepcionComprobante as Record<string, unknown>)
        : undefined;

      const estado =
        (wrapped && typeof wrapped.estado === "string"
          ? wrapped.estado
          : undefined) ??
        (typeof rr.estado === "string" ? rr.estado : undefined);

      console.log(
        "[SRI] Recepción raw:",
        JSON.stringify(receptionResult, null, 2)
      );

      if (!estado) {
        return fail(500, {
          step: "reception",
          error: "Respuesta del SRI inválida",
          receptionResult,
        });
      }

      if (estado !== "RECIBIDA") {
        const details =
          (wrapped && isRecord(wrapped.comprobantes)
            ? wrapped.comprobantes
            : undefined) ??
          (isRecord(receptionResult as unknown) &&
          isRecord((receptionResult as Record<string, unknown>).comprobantes)
            ? (receptionResult as Record<string, unknown>).comprobantes
            : undefined) ??
          receptionResult;

        return ok({
          success: false,
          accessKey,
          receptionStatus: estado,
          error: "Documento no recibido por el SRI",
          details,
        });
      }

      /* 13) Consultar Autorización SRI con retry */
      console.log("[SRI] Consultando autorización...");
      let authorizationNumber: string | undefined;
      let authorizationStatus: string | undefined;

      // Función auxiliar para buscar número de autorización recursivamente
      const searchForAuthNumber = (obj: unknown): string | undefined => {
        if (!isRecord(obj)) return undefined;
        
        // Buscar en propiedades comunes
        if (typeof obj.numeroAutorizacion === "string" && obj.numeroAutorizacion.length > 10) {
          return obj.numeroAutorizacion;
        }
        
        // Buscar recursivamente
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === "string" && key.toLowerCase().includes("autorizacion") && value.length > 10) {
            return value;
          }
          if (isRecord(value)) {
            const found = searchForAuthNumber(value);
            if (found) return found;
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              const found = searchForAuthNumber(item);
              if (found) return found;
            }
          }
        }
        return undefined;
      };

      // Intentar consultar autorización con retry (el SRI puede tardar unos segundos)
      const maxRetries = 3;
      const retryDelay = 2000; // 2 segundos entre intentos
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[SRI] Reintento ${attempt} de ${maxRetries} para obtener autorización...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }

          const authorizationResult = await documentAuthorization(
            accessKey,
            authorizationUrl
          );

          console.log(
            `[SRI] Autorización (intento ${attempt}):`,
            JSON.stringify(authorizationResult, null, 2)
          );

          const ar = authorizationResult as SriAuthorizationResponse;
          const res = ar?.RespuestaAutorizacionComprobante;

          if (res?.autorizaciones?.autorizacion) {
            const authData = res.autorizaciones.autorizacion;
            const auth = Array.isArray(authData) ? authData[0] : authData;

            authorizationStatus = auth.estado;
            // Extraer número de autorización si existe, independientemente del estado
            if (auth.numeroAutorizacion) {
              authorizationNumber = auth.numeroAutorizacion;
              console.log("[SRI] ✅ Número de autorización encontrado:", authorizationNumber);
              break; // Salir del loop si encontramos el número
            }
            
            console.log("[SRI] Estado de autorización:", {
              estado: authorizationStatus,
              numeroAutorizacion: auth.numeroAutorizacion,
              tieneNumero: !!auth.numeroAutorizacion,
            });
          } else {
            // Fallback: intentar obtener del objeto raíz
            authorizationStatus = ar.estado;
            authorizationNumber = ar.numeroAutorizacion;
            
            if (authorizationNumber) {
              console.log("[SRI] ✅ Número de autorización encontrado (fallback):", authorizationNumber);
              break;
            }
            
            console.log("[SRI] Fallback - Estado:", {
              estado: authorizationStatus,
              numeroAutorizacion: ar.numeroAutorizacion,
            });
          }
          
          // Si aún no tenemos el número, buscar recursivamente
          if (!authorizationNumber) {
            authorizationNumber = searchForAuthNumber(authorizationResult);
            if (authorizationNumber) {
              console.log("[SRI] ✅ Número de autorización encontrado (búsqueda recursiva):", authorizationNumber);
              break;
            }
          }
          
          // Si el estado es AUTORIZADO pero no tenemos número, seguir intentando
          if (authorizationStatus === "AUTORIZADO" && !authorizationNumber && attempt < maxRetries) {
            console.log("[SRI] ⚠️ Estado AUTORIZADO pero sin número, reintentando...");
            continue;
          }
          
          // Si encontramos el número o el estado no es AUTORIZADO, salir
          if (authorizationNumber || (authorizationStatus && authorizationStatus !== "AUTORIZADO")) {
            break;
          }
        } catch (e: unknown) {
          console.error(`[SRI] Error autorización (intento ${attempt}):`, e);
          if (attempt === maxRetries) {
            authorizationStatus = authorizationStatus || "ERROR_AUTORIZACION";
          }
        }
      }
      
      console.log("[SRI] Resultado final de autorización:", {
        authorizationNumber,
        authorizationStatus,
      });

      return ok({
        success: true,
        accessKey,
        authorizationNumber,
        receptionStatus: estado,
        authorizationStatus: authorizationStatus || "PENDIENTE",
      });
    } catch (e: unknown) {
      console.error("SRI] documentReception error:", e);
      return fail(500, {
        step: "reception",
        error: "El SRI no respondió a la recepción",
        message: errorMessage(e),
      });
    }
  } catch (error: unknown) {
    console.error("[SRI] Error crítico:", error);
    return fail(500, {
      step: "critical",
      error: "Error interno al procesar factura",
      message: errorMessage(error),
    });
  }
}