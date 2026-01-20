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
    iva?: number;
    ivaRate?: number;
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
    isDuplicate?: boolean;
    sriData?: {
        accessKey?: string;
        authorizationNumber?: string;
        authorizedAt?: string;
        status?: string;
        ambiente?: "1" | "2"; // "1" = pruebas, "2" = producción
        obligadoContabilidad?: "SI" | "NO";
    };
}

interface ReceiptProps {
    data: ReceiptData | null;
    printId?: string;
}

export const Receipt: React.FC<ReceiptProps> = ({ data, printId = "receipt-print" }) => {
    if (!data) return null;

    // Use IVA from data or calculate it
    const ivaRate = data.ivaRate ?? 0.15;
    const subtotal = data.subtotal;
    const tax = data.iva ?? (data.total - subtotal);

    const uniqueId = `receipt-${printId}`;
    
    return (
        <>
            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0 !important;
                        padding: 0 !important;
                        page-break-inside: avoid !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    [data-receipt-id="${uniqueId}"], [data-receipt-id="${uniqueId}"] * {
                        visibility: visible !important;
                    }
                    [data-receipt-id="${uniqueId}"] {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        font-weight: 600 !important;
                        font-size: 10px !important;
                        color: black !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        line-height: 1.2 !important;
                        page-break-inside: avoid !important;
                        box-sizing: border-box !important;
                        overflow-wrap: break-word !important;
                        word-wrap: break-word !important;
                    }
                    [data-receipt-id="${uniqueId}"] p {
                        margin: 0 !important;
                        padding: 0 !important;
                        line-height: 1.2 !important;
                    }
                    [data-receipt-id="${uniqueId}"] div {
                        margin: 0 !important;
                    }
                    [data-receipt-id="${uniqueId}"] span {
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                    }
                    [data-receipt-id="${uniqueId}"] img {
                        max-width: 100% !important;
                        height: auto !important;
                    }
                }
            `}</style>
            <div 
                className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:text-[10px] print:font-mono text-black print-only"
                data-receipt-id={uniqueId}
            >

            <div className="w-full pl-2 pr-2 pt-2 pb-2 text-left leading-tight">
                {/* Logo */}
                <div className="flex justify-center mb-1">
                    <img
                        src="/logo/mafercano.png"
                        alt="Logo"
                        className="h-12 object-contain print:h-12"
                    />
                </div>

                {/* Header Info */}
                <div className="text-center mb-1 uppercase tracking-wide text-[10px] font-bold leading-tight">
                    {data.businessInfo.ruc && (
                        <>
                            <p className="leading-tight text-[10px]">RUC: {data.businessInfo.ruc}</p>
                            {/* Tipo de RUC: Persona Jurídica (empieza con 10) */}
                            {data.businessInfo.ruc.startsWith('10') && (
                                <p className="text-[10px] font-normal leading-tight">PERSONA JURÍDICA</p>
                            )}
                            {data.businessInfo.ruc.startsWith('09') && (
                                <p className="text-[10px] font-normal leading-tight">PERSONA NATURAL</p>
                            )}
                        </>
                    )}
                    {data.businessInfo.address && <p className="leading-tight text-[10px]">Dir: {data.businessInfo.address}</p>}
                    {data.businessInfo.phone && <p className="leading-tight text-[10px]">Tel: {data.businessInfo.phone}</p>}
                </div>

                {/* Separator */}
                <div className="w-full border-b border-black border-dashed my-1" />

                {/* Invoice Details */}
                <div className="text-center mb-1 leading-tight">
                    <p className="text-[10px] font-bold leading-tight">COMPROBANTE DE FACTURACIÓN ELECTRÓNICA</p>
                    {data.isDuplicate && (
                        <p className="text-[10px] mt-0.5 font-bold border border-black py-0.5 px-1 inline-block leading-tight">DUPLICADO</p>
                    )}
                </div>

                {/* SRI Information - Always show if SRI data exists */}
                {data.sriData && (
                    <div className="mb-1 mt-1 text-[10px] leading-tight">
                        <div className="mb-0.5">
                            <p className="font-bold leading-tight text-[10px]">No. N°:</p>
                            <p className="leading-tight text-[10px]">{data.invoiceNumber}</p>
                        </div>
                        
                        {data.sriData.authorizedAt && (
                            <div className="mb-0.5">
                                <p className="font-bold leading-tight text-[10px]">FECHA Y HORA DE AUTORIZACIÓN:</p>
                                <p className="leading-tight text-[10px]">{new Date(data.sriData.authorizedAt).toISOString().replace('Z', '-05:00')}</p>
                            </div>
                        )}
                        
                        {data.sriData.ambiente && (
                            <div className="mb-0.5">
                                <p className="font-bold leading-tight text-[10px]">AMBIENTE:</p>
                                <p className="leading-tight text-[10px]">{data.sriData.ambiente === "2" ? "PRODUCCION" : "PRUEBAS"}</p>
                            </div>
                        )}
                        
                        {data.sriData.accessKey && (
                            <div className="mb-0.5">
                                <p className="font-bold leading-tight text-[10px]">CLAVE DE ACCESO/AUTORIZACIÓN:</p>
                                <p className="break-all text-[10px] leading-tight font-mono">{data.sriData.accessKey}</p>
                            </div>
                        )}
                        
                        {data.sriData.obligadoContabilidad !== undefined && (
                            <div className="mb-0.5">
                                <p className="font-bold leading-tight text-[10px]">OBLIGADO A LLEVAR CONTABILIDAD:</p>
                                <p className="leading-tight text-[10px]">{data.sriData.obligadoContabilidad}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="w-full border-b border-black border-dashed my-1" />

                {/* Customer Info */}
                <div className="mb-1 text-left text-[10px] leading-tight">
                    <p className="leading-tight">CLIENTE: <span className="uppercase">{data.customerData?.name || "CONSUMIDOR FINAL"}</span></p>
                    <p className="leading-tight">RUC/CI: <span>{data.customerData?.identification || "9999999999999"}</span></p>
                    {data.customerData?.address && <p className="truncate leading-tight">DIR: <span>{data.customerData.address}</span></p>}
                </div>

                <div className="w-full border-b border-black border-dashed my-1" />

                {/* Items Table */}
                <div className="mb-1">
                    <div className="flex mb-0.5 text-[10px] leading-tight">
                        <div className="w-[15%] text-center">CANT</div>
                        <div className="w-[55%] px-0.5">DETALLE</div>
                        <div className="w-[30%] text-right">TOTAL</div>
                    </div>
                    {data.items.map((item, index) => (
                        <div key={index} className="flex mb-0.5 text-[10px] items-start leading-tight">
                            <div className="w-[15%] text-center leading-tight">{item.quantity}</div>
                            <div className="w-[55%] px-0.5 uppercase leading-tight">
                                {item.description}
                            </div>
                            <div className="w-[30%] text-right leading-tight">
                                ${item.subtotal.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full border-b border-black border-dashed my-1" />

                {/* Totals */}
                <div className="flex flex-col items-end mb-1 text-[10px] leading-tight">
                    <div className="flex justify-between w-full">
                        <span className="leading-tight text-[10px]">SUBTOTAL:</span>
                        <span className="leading-tight text-[10px]">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full">
                        <span className="leading-tight text-[10px]">IVA {Math.round(ivaRate * 100)}%:</span>
                        <span className="leading-tight text-[10px]">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full text-[10px] mt-0.5 border-t border-black border-dashed pt-0.5">
                        <span className="font-bold leading-tight text-[10px]">TOTAL:</span>
                        <span className="font-bold leading-tight text-[10px]">${data.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="mb-1 text-[10px] leading-tight">
                    <p className="uppercase leading-tight">PAGO: <span>{data.paymentMethod === 'cash' ? 'EFECTIVO' : data.paymentMethod === 'transfer' ? 'TRANSFERENCIA' : 'TARJETA'}</span></p>
                    {data.amountReceived !== undefined && (
                        <p className="leading-tight">RECIBIDO: <span>${data.amountReceived.toFixed(2)}</span></p>
                    )}
                    {data.change !== undefined && (
                        <p className="leading-tight">CAMBIO: <span>${data.change.toFixed(2)}</span></p>
                    )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-1 print:flex">
                    <img
                        src="/qr/qrMafer.png"
                        alt="QR Code"
                        className="w-24 h-24 contrast-125 print:w-20 print:h-20 print:block print:object-contain"
                    />
                </div>

                {/* Footer */}
                <div className="text-center text-[10px] leading-tight">
                    <p className="leading-tight text-[10px]">Desarrollado por IonosHub - 0992249152</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide leading-tight">GRACIAS POR SU COMPRA</p>
                </div>
            </div>
            </div>
        </>
    );
};
