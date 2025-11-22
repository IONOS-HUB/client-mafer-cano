import { CustomerData } from "./invoice-types";
import { SaleItem } from "./types";

interface PrintReceiptData {
    invoiceNumber: string;
    date: string;
    customerData?: CustomerData;
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }>;
    subtotal: number;
    total: number;
    paymentMethod: string;
    amountReceived?: number;
    change?: number;
    businessInfo: {
        name: string;
        ruc?: string;
        address?: string;
        phone?: string;
    };
}

const PRINT_SERVER_URL = "http://localhost:3001";

export const printerService = {
    async checkStatus(): Promise<boolean> {
        try {
            const response = await fetch(`${PRINT_SERVER_URL}/status`, {
                method: "GET",
            });
            return response.ok;
        } catch (error) {
            console.error("Servidor de impresión no disponible:", error);
            return false;
        }
    },

    async printReceipt(
        saleItems: SaleItem[],
        total: number,
        paymentMethod: string,
        customerData?: CustomerData,
        amountReceived?: number,
        change?: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Verificar si el servidor está disponible
            const isOnline = await this.checkStatus();
            if (!isOnline) {
                return {
                    success: false,
                    error: "Servidor de impresión no disponible. Asegúrate de que esté corriendo.",
                };
            }

            // Generar número de factura (puedes mejorar esto con un contador en la BD)
            const invoiceNumber = `${Date.now().toString().slice(-8)}`;

            // Formatear fecha
            const date = new Intl.DateTimeFormat("es-EC", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date());

            // Preparar items para impresión
            const items = saleItems.map((item) => ({
                description: item.product?.description || item.service?.description || "Item",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
            }));

            // Calcular subtotal (sin IVA)
            const subtotal = total / 1.15; // Asumiendo IVA 15%

            // Datos del negocio (puedes moverlos a variables de entorno)
            const businessInfo = {
                name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "MAFER CANO",
                ruc: process.env.NEXT_PUBLIC_BUSINESS_RUC || "",
                address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
                phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "",
            };

            const receiptData: PrintReceiptData = {
                invoiceNumber,
                date,
                customerData,
                items,
                subtotal,
                total,
                paymentMethod,
                amountReceived,
                change,
                businessInfo,
            };

            // Enviar a imprimir
            const response = await fetch(`${PRINT_SERVER_URL}/print`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(receiptData),
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.error || "Error al imprimir",
                };
            }

            return { success: true };
        } catch (error) {
            console.error("Error al imprimir:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Error desconocido",
            };
        }
    },
};
