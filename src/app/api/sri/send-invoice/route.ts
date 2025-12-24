import { NextRequest, NextResponse } from "next/server";
import {
  generateInvoice,
  generateInvoiceXml,
  getP12FromUrl,
  signXml,
  documentReception,
  documentAuthorization,
} from "open-factura";
import { readFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceData } = body;

    if (!invoiceData) {
      return NextResponse.json(
        { error: "invoiceData es requerido" },
        { status: 400 }
      );
    }

    // Obtener configuración del SRI desde variables de entorno
    const p12Url = process.env.SRI_P12_URL;
    const p12Path = process.env.SRI_P12_PATH; // Ruta local al archivo
    const p12Password = process.env.SRI_P12_PASSWORD;
    const receptionUrl =
      process.env.SRI_RECEPTION_URL ||
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl";
    const authorizationUrl =
      process.env.SRI_AUTHORIZATION_URL ||
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl";

    if ((!p12Url && !p12Path) || !p12Password) {
      return NextResponse.json(
        {
          error:
            "Configuración del SRI incompleta. Verifique SRI_P12_URL o SRI_P12_PATH y SRI_P12_PASSWORD",
        },
        { status: 500 }
      );
    }

    // Generar factura con open-factura
    const { invoice, accessKey } = generateInvoice(invoiceData);

    // Generar XML
    const invoiceXml = generateInvoiceXml(invoice);

    // Obtener firma electrónica (desde URL o archivo local)
    let signature: ArrayBuffer;
    if (p12Path) {
      // Leer desde archivo local
      const filePath = p12Path.startsWith("/")
        ? p12Path
        : join(process.cwd(), p12Path);
      const fileBuffer = await readFile(filePath);
      signature = fileBuffer.buffer;
    } else if (p12Url) {
      // Leer desde URL
      signature = await getP12FromUrl(p12Url);
    } else {
      throw new Error("No se especificó SRI_P12_URL ni SRI_P12_PATH");
    }

    // Firmar XML
    const signedInvoice = await signXml(signature, p12Password, invoiceXml);

    // Enviar a recepción del SRI
    const receptionResult = await documentReception(
      signedInvoice,
      receptionUrl
    );

    if (!receptionResult || !receptionResult.estado) {
      return NextResponse.json(
        {
          error: "Error en la recepción del SRI",
          details: receptionResult,
        },
        { status: 500 }
      );
    }

    // Si la recepción fue exitosa, autorizar
    let authorizationNumber: string | undefined;
    let authorizationStatus: string | undefined;
    
    if (receptionResult.estado === "RECIBIDA") {
      try {
        const authorizationResult = await documentAuthorization(
          accessKey,
          authorizationUrl
        );

        if (authorizationResult) {
          authorizationStatus = authorizationResult.estado;
          
          if (authorizationResult.estado === "AUTORIZADO") {
            authorizationNumber = authorizationResult.numeroAutorizacion;
          }
        }
      } catch (authError) {
        console.error("Error en autorización:", authError);
        // Continuar aunque falle la autorización, la recepción fue exitosa
      }
    }

    return NextResponse.json({
      success: true,
      accessKey,
      authorizationNumber,
      receptionStatus: receptionResult.estado,
      authorizationStatus,
    });
  } catch (error) {
    console.error("Error processing SRI invoice:", error);
    return NextResponse.json(
      {
        error: "Error al procesar factura electrónica",
        message:
          error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

