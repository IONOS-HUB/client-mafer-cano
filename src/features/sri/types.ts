export interface SRICompanyInfo {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionMatriz: string;
  establecimiento: string; // Ej: "001"
  puntoEmision: string; // Ej: "001"
  codDoc: string; // "01" para factura
  ambiente: "1" | "2"; // "1" = pruebas, "2" = producción
}

export interface SRIConfig {
  companyInfo: SRICompanyInfo;
  p12Url?: string; // URL del archivo .p12
  p12Password: string;
  receptionUrl: string;
  authorizationUrl: string;
}

export interface SRIIssueStatus {
  status: "pending" | "sent" | "authorized" | "rejected" | "error";
  accessKey?: string;
  authorizationNumber?: string;
  errorMessage?: string;
  sentAt?: string;
  authorizedAt?: string;
}

export interface SRIIssueResult {
  success: boolean;
  accessKey?: string;
  authorizationNumber?: string;
  errorMessage?: string;
}

