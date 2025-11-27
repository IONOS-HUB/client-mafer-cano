import React from "react";
import { CustomerData } from "../invoice-types";

export interface ReceiptData {
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

interface ReceiptProps {
    data: ReceiptData | null;
}

export const Receipt: React.FC<ReceiptProps> = ({ data }) => {
    if (!data) return null;

    // Calculate tax (assuming 15% included in total)
    const taxRate = 0.15;
    const subtotal = data.total / (1 + taxRate);
    const tax = data.total - subtotal;

    return (
        <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:text-base print:font-mono text-black print-only">
            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-only, .print-only * {
                        visibility: visible;
                    }
                    .print-only {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        font-family: 'Courier New', Courier, monospace;
                        font-weight: 700;
                        font-size: 16px; /* Increased base font size */
                        color: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div className="w-full pl-0 pr-4 pt-4 pb-8 text-left">
                {/* Logo */}
                <div className="flex justify-center mb-4">
                    <img
                        src="/logo/mafercano.png"
                        alt="Logo"
                        className="h-28 object-contain"
                    />
                </div>

                {/* Header Info */}
                <div className="text-center mb-4 uppercase tracking-wide text-base font-bold">
                    <p>RUC: 1003573167001</p>
                    <p className="mt-1">Dir: Av. Camilo Ponce y Av. Ricardo Sánchez</p>
                    <p className="mt-1">Tel: 0998007892</p>
                </div>

                {/* Separator */}
                <div className="w-full border-b-2 border-black border-dashed my-2" />

                {/* Invoice Details */}
                <div className="text-center mb-2">
                    <p className="text-lg">FACTURA ELECTRONICA</p>
                    <p className="text-xl mt-1">No. {data.invoiceNumber}</p>
                    <p className="text-base mt-1">Fecha: {data.date}</p>
                </div>

                <div className="w-full border-b-2 border-black border-dashed my-2" />

                {/* Customer Info */}
                <div className="mb-2 text-left text-base leading-relaxed">
                    <p>CLIENTE: <span className="uppercase">{data.customerData?.name || "CONSUMIDOR FINAL"}</span></p>
                    <p>RUC/CI: <span>{data.customerData?.identification || "9999999999999"}</span></p>
                    {data.customerData?.address && <p className="truncate">DIR: <span>{data.customerData.address}</span></p>}
                </div>

                <div className="w-full border-b-2 border-black border-dashed my-2" />

                {/* Items Table */}
                <div className="mb-2">
                    <div className="flex mb-2 text-base">
                        <div className="w-[15%] text-center">CANT</div>
                        <div className="w-[55%] px-1">DETALLE</div>
                        <div className="w-[30%] text-right">TOTAL</div>
                    </div>
                    {data.items.map((item, index) => (
                        <div key={index} className="flex mb-2 text-base items-start">
                            <div className="w-[15%] text-center">{item.quantity}</div>
                            <div className="w-[55%] px-1 uppercase leading-tight">
                                {item.description}
                            </div>
                            <div className="w-[30%] text-right">
                                ${item.subtotal.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full border-b-2 border-black border-dashed my-2" />

                {/* Totals */}
                <div className="flex flex-col items-end mb-4 text-base">
                    <div className="flex justify-between w-full max-w-[65mm]">
                        <span>SUBTOTAL:</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[65mm] mt-1">
                        <span>IVA 15%:</span>
                        <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[65mm] text-2xl mt-2 border-t-2 border-black border-dashed pt-2">
                        <span>TOTAL:</span>
                        <span>${data.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6 text-base">
                    <p className="uppercase">PAGO: <span>{data.paymentMethod === 'cash' ? 'EFECTIVO' : data.paymentMethod === 'transfer' ? 'TRANSFERENCIA' : 'TARJETA'}</span></p>
                    {data.amountReceived !== undefined && (
                        <p className="mt-1">RECIBIDO: <span>${data.amountReceived.toFixed(2)}</span></p>
                    )}
                    {data.change !== undefined && (
                        <p className="mt-1">CAMBIO: <span>${data.change.toFixed(2)}</span></p>
                    )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                    <img
                        src="/qr/qrMafer.png"
                        alt="QR Code"
                        className="w-40 h-40 contrast-125"
                    />
                </div>

                {/* Footer */}
                <div className="text-center text-sm space-y-1">
                    <p>Desarrollado por IonosHub - 0992249152</p>
                    <p className="mt-4 text-base uppercase tracking-wider">GRACIAS POR SU COMPRA</p>
                </div>
            </div>
        </div>
    );
};
