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
                        width: 100% !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        font-weight: 700 !important;
                        font-size: 16px !important;
                        color: black !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
            <div 
                className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:text-base print:font-mono text-black print-only"
                data-receipt-id={uniqueId}
            >

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
                    {data.businessInfo.ruc && (
                        <>
                            <p>RUC: {data.businessInfo.ruc}</p>
                            {/* Tipo de RUC: Persona Jurídica (empieza con 10) */}
                            {data.businessInfo.ruc.startsWith('10') && (
                                <p className="mt-1 text-xs font-normal">PERSONA JURÍDICA</p>
                            )}
                            {data.businessInfo.ruc.startsWith('09') && (
                                <p className="mt-1 text-xs font-normal">PERSONA NATURAL</p>
                            )}
                        </>
                    )}
                    {data.businessInfo.address && <p className="mt-1">Dir: {data.businessInfo.address}</p>}
                    {data.businessInfo.phone && <p className="mt-1">Tel: {data.businessInfo.phone}</p>}
                </div>

                {/* Separator */}
                <div className="w-full border-b-2 border-black border-dashed my-2" />

                {/* Invoice Details */}
                <div className="text-center mb-2">
                    <p className="text-lg">COMPROBANTE DE FACTURACIÓN ELECTRÓNICA</p>
                    {data.isDuplicate && (
                        <p className="text-base mt-1 font-bold border-2 border-black py-1 px-2 inline-block">DUPLICADO</p>
                    )}
                </div>

                {/* SRI Information - Always show if SRI data exists */}
                {data.sriData && (
                    <div className="mb-2 mt-2 text-xs leading-relaxed">
                        {data.sriData.authorizedAt && (
                            <div className="mb-1">
                                <p className="font-bold">ESTADO SRI:</p>
                                <p>{new Date(data.sriData.authorizedAt).toISOString().replace('Z', '-05:00')}</p>
                            </div>
                        )}
                        
                        <div className="mb-1">
                            <p className="font-bold">No. N°:</p>
                            <p>{data.invoiceNumber}</p>
                        </div>
                        
                        <div className="mb-1">
                            <p className="font-bold">NÚMERO DE AUTORIZACIÓN:</p>
                            <p className="break-all">
                                {data.sriData.authorizationNumber || "PENDIENTE"}
                            </p>
                        </div>
                        
                        {data.sriData.authorizedAt && (
                            <div className="mb-1">
                                <p className="font-bold">FECHA Y HORA DE AUTORIZACIÓN:</p>
                                <p>{new Date(data.sriData.authorizedAt).toISOString().replace('Z', '-05:00')}</p>
                            </div>
                        )}
                        
                        {data.sriData.ambiente && (
                            <div className="mb-1">
                                <p className="font-bold">AMBIENTE:</p>
                                <p>{data.sriData.ambiente === "2" ? "PRODUCCION" : "PRUEBAS"}</p>
                            </div>
                        )}
                        
                        <div className="mb-1">
                            <p className="font-bold">EMISIÓN:</p>
                            <p>NORMAL</p>
                        </div>
                        
                        {data.sriData.accessKey && (
                            <div className="mb-1">
                                <p className="font-bold">CLAVE DE ACCESO:</p>
                                <p className="break-all text-[10px] leading-tight font-mono">{data.sriData.accessKey}</p>
                            </div>
                        )}
                        
                        {data.sriData.obligadoContabilidad !== undefined && (
                            <div className="mb-1">
                                <p className="font-bold">OBLIGADO A LLEVAR CONTABILIDAD:</p>
                                <p>{data.sriData.obligadoContabilidad}</p>
                            </div>
                        )}
                    </div>
                )}

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
                        <span>IVA {Math.round(ivaRate * 100)}%:</span>
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
        </>
    );
};
