import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SriAutorizacion {
  estado?: string;
  numeroAutorizacion?: string;
}

interface SriAuthorizationResponse {
  RespuestaAutorizacionComprobante?: {
    autorizaciones?: {
      autorizacion?: SriAutorizacion | SriAutorizacion[];
    };
  };
  estado?: string;
  numeroAutorizacion?: string;
}

// open-factura's documentAuthorization doesn't check `err` from createClient,
// causing an unhandledRejection when the SOAP client can't be created.
async function safeDocumentAuthorization(
  accessKey: string,
  authorizationUrl: string
): Promise<unknown> {
  const soap = await import("soap");
  return new Promise((resolve, reject) => {
    soap.createClient(authorizationUrl, (err, client) => {
      if (err || !client) {
        reject(err ?? new Error("No se pudo crear el cliente SOAP de autorización"));
        return;
      }
      client.autorizacionComprobante(
        { claveAccesoComprobante: accessKey },
        (err2: unknown, result: unknown) => {
          if (err2) {
            reject(err2);
            return;
          }
          resolve(result);
        }
      );
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function searchForAuthNumber(obj: unknown): string | undefined {
  if (!isRecord(obj)) return undefined;
  if (typeof obj.numeroAutorizacion === "string" && obj.numeroAutorizacion.length > 10) {
    return obj.numeroAutorizacion;
  }
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessKey = typeof body?.accessKey === "string" ? body.accessKey : undefined;

    if (!accessKey || accessKey.length !== 49) {
      return NextResponse.json(
        { success: false, error: "accessKey inválida (se requieren 49 dígitos)" },
        { status: 400 }
      );
    }

    const authorizationUrl =
      process.env.SRI_AUTHORIZATION_URL ||
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl";

    let authorizationNumber: string | undefined;
    let authorizationStatus: string | undefined;

    try {
      const result = await safeDocumentAuthorization(accessKey, authorizationUrl);
      console.log("[SRI check-auth]", JSON.stringify(result, null, 2));

      const ar = result as SriAuthorizationResponse;
      const res = ar?.RespuestaAutorizacionComprobante;

      if (res?.autorizaciones?.autorizacion) {
        const authData = res.autorizaciones.autorizacion;
        const auth = Array.isArray(authData) ? authData[0] : authData;
        authorizationStatus = auth.estado;
        authorizationNumber = auth.numeroAutorizacion;
      } else {
        authorizationStatus = ar.estado;
        authorizationNumber = ar.numeroAutorizacion;
      }

      if (!authorizationNumber) {
        authorizationNumber = searchForAuthNumber(result);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[SRI check-auth] Error:", msg);
      return NextResponse.json({ success: false, error: msg });
    }

    return NextResponse.json({
      success: !!authorizationNumber,
      authorizationNumber,
      authorizationStatus: authorizationStatus || "PENDIENTE",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
