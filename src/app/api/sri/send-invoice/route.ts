import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Next 16
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
  // Propiedades de fallback si vienen en la raíz
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

/* ----------------------------- Helpers clave ----------------------------- */
function padLeft(value: string, len: number, ch = "0") {
  return String(value ?? "").padStart(len, ch);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatDdMmYyyyToDdMmYyyyNoSlash(fecha: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fecha ?? ""));
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${dd}${mm}${yyyy}`;
}

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

function stripBomAndNormalize(xml: string) {
  return String(xml ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}
/**
 * XSD: <pagos><pago>...</pago></pagos>
 * Tu XML viene: <pagos><formaPago>...</formaPago><total>...</total></pagos>
 * - No quita nada: solo envuelve el contenido dentro de <pago> si falta.
 */
function ensurePagosHasPago(xml: string) {
  const re = /<pagos>([\s\S]*?)<\/pagos>/g;
  if (!re.test(xml)) return { xml, changed: false, reason: "no <pagos>" };

  let changed = false;

  const out = xml.replace(re, (full, inner) => {
    // si ya está bien, no tocar
    if (/<pago>[\s\S]*?<\/pago>/.test(inner)) return full;

    const trimmed = String(inner ?? "").trim();
    if (!trimmed) return full;

    // envolver sin quitar nada
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
 * SOLO PERMITE id="comprobante" (minúscula)
 * - Si encuentra Id="comprobante" lo elimina (SRI lo rechaza)
 * - Si NO existe id="comprobante", lo inserta
 * - Si hay duplicados, deja uno solo
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
 * DOM globals (Node) para xml-crypto/xpath
 */

async function ensureXmlDomGlobals() {
  const g = globalThis as unknown as DomGlobals;

  if (g.DOMParser && g.XMLSerializer) return;

  const xmldom = await import("@xmldom/xmldom");

  // No necesitamos tipar DOMParser/XMLSerializer a fondo: solo existir como globals
  g.DOMParser =
    g.DOMParser ?? (xmldom as unknown as { DOMParser: unknown }).DOMParser;
  g.XMLSerializer =
    g.XMLSerializer ??
    (xmldom as unknown as { XMLSerializer: unknown }).XMLSerializer;

  console.log("[SRI] XML DOM globals set via @xmldom/xmldom");
}

/**
 * Reemplaza el contenido de un tag (si existe)
 */
function setXmlTagValue(xml: string, tag: string, value: string) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  if (re.test(xml)) return xml.replace(re, `<${tag}>${value}</${tag}>`);
  return xml;
}

/**
 * Asegura que dentro de <infoTributaria> exista <claveAcceso> y esté ANTES de <codDoc>
 * - El SRI valida orden estricto del XSD.
 * - No quita nada: solo mueve/inyecta <claveAcceso> en el lugar correcto.
 */
function ensureClaveAccesoBeforeCodDoc(xml: string, accessKey: string) {
  const m = /<infoTributaria>([\s\S]*?)<\/infoTributaria>/.exec(xml);
  if (!m) return { xml, changed: false, reason: "no <infoTributaria>" };

  let inner = m[1];
  const before = inner;

  // quitar cualquier claveAcceso existente para no duplicar
  inner = inner.replace(/<claveAcceso>[\s\S]*?<\/claveAcceso>\s*/g, "");

  // insertar antes de codDoc
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
 * SRI espera <totalConImpuestos> (NO <totalImpuestos>) dentro de <infoFactura>
 * - No quita nada: solo renombra el tag de apertura/cierre.
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
 * ESTRUCTURA XSD:
 * <totalConImpuestos>
 *   <totalImpuesto>
 *     <codigo>...</codigo>
 *     <codigoPorcentaje>...</codigoPorcentaje>
 *     <baseImponible>...</baseImponible>
 *     <tarifa>...</tarifa> (si aplica)
 *     <valor>...</valor>
 *   </totalImpuesto>
 * </totalConImpuestos>
 *
 * - No quita nada: solo envuelve el contenido en <totalImpuesto> si falta.
 */
function ensureTotalConImpuestosHasTotalImpuesto(xml: string) {
  const re = /<totalConImpuestos>([\s\S]*?)<\/totalConImpuestos>/g;
  if (!re.test(xml))
    return { xml, changed: false, reason: "no <totalConImpuestos>" };

  let changed = false;

  const out = xml.replace(re, (full, inner) => {
    // Si ya viene bien (ya tiene totalImpuesto), no tocar
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
 * XSD detalle: antes de <precioTotalSinImpuesto> debe venir <descuento> (o precioSinSubsidio)
 * Si no existe <descuento>, lo inserta como 0.00 justo antes de <precioTotalSinImpuesto>
 * (No quita nada)
 */
function ensureDetalleHasDescuentoBeforePrecioTotal(xml: string) {
  // Solo trabaja dentro de cada <detalle>...</detalle>
  const reDetalle = /<detalle>([\s\S]*?)<\/detalle>/g;
  if (!reDetalle.test(xml))
    return { xml, changed: false, reason: "no <detalle>" };

  let changed = false;

  const out = xml.replace(reDetalle, (full, inner) => {
    // Si no hay precioTotalSinImpuesto, no tocar
    if (!/<precioTotalSinImpuesto>/.test(inner)) return full;

    // Si ya existe descuento o precioSinSubsidio antes, no tocar
    if (/<descuento>[\s\S]*?<\/descuento>/.test(inner)) return full;
    if (/<precioSinSubsidio>[\s\S]*?<\/precioSinSubsidio>/.test(inner))
      return full;

    // Insertar descuento 0.00 justo antes de precioTotalSinImpuesto
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
 * XSD detalle: <impuestos><impuesto>...</impuesto></impuestos>
 * Si viene <impuestos><codigo>...</codigo>...</impuestos> => lo envuelve en <impuesto>
 * (No quita nada)
 */
function ensureDetalleImpuestosHasImpuesto(xml: string) {
  const re = /<impuestos>([\s\S]*?)<\/impuestos>/g;
  if (!re.test(xml)) return { xml, changed: false, reason: "no <impuestos>" };

  let changed = false;

  const out = xml.replace(re, (full, inner) => {
    // ya ok
    if (/<impuesto>[\s\S]*?<\/impuesto>/.test(inner)) return full;

    const trimmed = String(inner ?? "").trim();
    if (!trimmed) return full;

    // envolver
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
 * Patch crítico ANTES de firmar:
 * - fuerza <fechaEmision> con la del invoiceData
 * - orden XSD: claveAcceso ANTES de codDoc
 * - nombre correcto: totalConImpuestos
 * - estructura correcta: totalConImpuestos -> totalImpuesto -> (codigo, ...)
 * - SIN QUITAR NADA: solo reordena/inserta/renombra/envuelve lo necesario
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

/* --------------------------------- Handler -------------------------------- */
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
    // 1) Body
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

    // 2) Env
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

    // 3) DOM globals
    await ensureXmlDomGlobals();

    // 4) Import open-factura (usamos todo menos signXml)
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

    // 5) Leer P12 => Buffer (IMPORTANTE para open-factura)
    let signatureP12: Buffer;

    try {
      if (p12Path) {
        const filePath = join(process.cwd(), p12Path);
        console.log("[SRI] Leyendo certificado:", filePath);

        const fileBuffer = await readFile(filePath);
        signatureP12 = fileBuffer; // Buffer directo

        console.log("[SRI] Certificado OK (bytes):", fileBuffer.byteLength);
      } else {
        console.log("[SRI] Descargando certificado desde URL...");
        const ab = await getP12FromUrl(p12Url);
        signatureP12 = Buffer.from(new Uint8Array(ab)); // convertir a Buffer
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

    // 6) Validar fechaEmision
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

    // 7) Clave manual (49)
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

    // asegurar objeto para setear claveAcceso (sin any)
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

    // 8) Generar XML
    let invoiceXml: string;
    try {
      console.log("🧩 [SRI] generateInvoice...");
      const { invoice } = generateInvoice(invoiceData);

      console.log("🧩 [SRI] generateInvoiceXml(invoice)...");
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
    console.log("[SRI] XML preview:", invoiceXml.slice(0, 220));

    if (
      !invoiceXml.includes("<factura") ||
      !invoiceXml.includes("</factura>")
    ) {
      return fail(500, {
        step: "xmlValidate",
        error: "XML no parece una factura completa (tag factura incompleta)",
      });
    }

    // 9) Root: SOLO id="comprobante" (minúscula). PROHIBIDO Id="..."
    const fix = ensureRootHasLowercaseIdOnly(invoiceXml);
    invoiceXml = fix.xml;
    console.log("🛠️ [SRI] root id fix:", {
      changed: fix.changed,
      reason: fix.reason,
      rootTag: fix.rootTag,
    });

    // 10) PATCH CRÍTICO
    invoiceXml = patchSriXmlBeforeSign(invoiceXml, accessKey, fechaEmision);

    console.log(
      "🔎 [SRI] XML fechaEmision tag:",
      /<fechaEmision>[\s\S]*?<\/fechaEmision>/.exec(invoiceXml)?.[0]
    );
    console.log(
      "🔎 [SRI] XML claveAcceso tag:",
      /<claveAcceso>[\s\S]*?<\/claveAcceso>/.exec(invoiceXml)?.[0]
    );
    console.log(
      "🔎 [SRI] infoTributaria preview:",
      /<infoTributaria>[\s\S]*?<\/infoTributaria>/
        .exec(invoiceXml)?.[0]
        ?.slice(0, 450)
    );
    console.log(
      "🔎 [SRI] infoFactura preview:",
      /<infoFactura>[\s\S]*?<\/infoFactura>/
        .exec(invoiceXml)?.[0]
        ?.slice(0, 900)
    );

    // 11) Firmar (ec-sri-invoice-signer)
    let signedXml: string;
    try {
      console.log("🧩 [SRI] signing (ec-sri-invoice-signer)...");

      const { signInvoiceXml } = await import("ec-sri-invoice-signer");

      // Preparamos el XML con id minúscula
      const xmlToSign = normalizeXmlForSriSigner(invoiceXml);

      signedXml = signInvoiceXml(xmlToSign, signatureP12, {
        pkcs12Password: p12Password,
      });

      // Si la librería forzó Id="comprobante" (con I mayúscula), lo bajamos a minúscula
      if (signedXml.includes('Id="comprobante"')) {
        console.log("⚠️ [SRI] Corrigiendo 'Id' a 'id' post-firma (Safety Fix)");
        signedXml = signedXml.replace('Id="comprobante"', 'id="comprobante"');
      }

      console.log("[SRI] XML firmado OK (ec-sri-invoice-signer)");
      console.log("🧪 has Signature?", /<(\w+:)?Signature\b/.test(signedXml));
      console.log(
        "🧪 has SignedProperties?",
        /SignedProperties/.test(signedXml)
      );
    } catch (e: unknown) {
      console.error("SRI] Firma (ec-sri-invoice-signer) falló:", e);
      return fail(500, {
        step: "signSriSigner",
        error: "Error al firmar XML (ec-sri-invoice-signer)",
        message: errorMessage(e),
      });
    }

    // 12) Recepción
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

      // 13) Autorización
      console.log("[SRI] Consultando autorización...");
      let authorizationNumber: string | undefined;
      let authorizationStatus: string | undefined;

      try {
        const authorizationResult = await documentAuthorization(
          accessKey,
          authorizationUrl
        );

        console.log(
          "[SRI] Autorización:",
          JSON.stringify(authorizationResult, null, 2)
        );

        // Cast a nuestra Interface en lugar de 'any'
        const ar = authorizationResult as SriAuthorizationResponse;
        const res = ar?.RespuestaAutorizacionComprobante;

        if (res?.autorizaciones?.autorizacion) {
          const authData = res.autorizaciones.autorizacion;

          // Manejo de Objeto o Array sin usar 'any'
          const auth = Array.isArray(authData) ? authData[0] : authData;

          authorizationStatus = auth.estado;
          if (authorizationStatus === "AUTORIZADO") {
            authorizationNumber = auth.numeroAutorizacion;
          }
        } else {
          // Fallback por si la estructura viene plana (depende de la versión de open-factura)
          authorizationStatus = ar.estado;
          authorizationNumber = ar.numeroAutorizacion;
        }
      } catch (e: unknown) {
        console.error("⚠️ [SRI] Error autorización:", e);
        authorizationStatus = authorizationStatus || "ERROR_AUTORIZACION";
      }

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
