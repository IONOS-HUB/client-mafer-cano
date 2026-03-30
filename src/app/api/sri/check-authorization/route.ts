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

type OpenFacturaModule = {
  documentAuthorization: (accessKey: string, wsdlUrl: string) => Promise<unknown>;
};

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

    const facturaLib = (await import("open-factura")) as unknown as OpenFacturaModule;
    const { documentAuthorization } = facturaLib;

    let authorizationNumber: string | undefined;
    let authorizationStatus: string | undefined;

    try {
      const result = await documentAuthorization(accessKey, authorizationUrl);
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
