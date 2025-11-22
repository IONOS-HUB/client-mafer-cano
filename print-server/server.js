const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');

const PORT = 3001;
const PRINTER_NAME = "POSPrinter POS-80C"; // Nombre exacto de tu impresora en Windows

// Rutas de imágenes
const LOGO_PATH = path.join(__dirname, '../public/logo/mafercano.png');
const QR_PATH = path.join(__dirname, '../public/qr/qrMafer.png');

async function printReceipt(receiptData) {
    return new Promise(async (resolve, reject) => {
        try {
            const printer = new ThermalPrinter({
                type: PrinterTypes.EPSON, // ESC/POS standard
                interface: 'tcp://localhost:9100', // Dummy interface, usamos getBuffer() y PowerShell
                width: 48, // 48 caracteres para 80mm (Font A)
                characterSet: CharacterSet.SLOVENIA, // Soporte básico de caracteres, ajustar si es necesario
                removeSpecialCharacters: false
            });

            const {
                invoiceNumber,
                date,
                customerData,
                items,
                subtotal,
                total,
                paymentMethod,
                businessInfo
            } = receiptData;

            // 1. LOGO
            printer.alignCenter();
            if (fs.existsSync(LOGO_PATH)) {
                await printer.printImage(LOGO_PATH);
                printer.newLine();
            }
            printer.bold(true);
            printer.println(businessInfo.name || 'MAFER CANO');
            printer.bold(false);

            if (businessInfo.ruc) printer.println(`RUC: ${businessInfo.ruc}`);
            if (businessInfo.address) printer.println(businessInfo.address);
            if (businessInfo.phone) printer.println(`Tel: ${businessInfo.phone}`);
            printer.drawLine();

            // 3. DATOS FACTURA
            printer.bold(true);
            printer.println('FACTURA ELECTRÓNICA DE VENTA');
            printer.println(`No. ${invoiceNumber}`);
            printer.bold(false);
            printer.println(`Fecha: ${date}`);
            printer.drawLine();

            // 4. CLIENTE
            printer.alignLeft();
            const clientName = customerData?.business_name || customerData?.name || 'CONSUMIDOR FINAL';
            const clientId = customerData?.identification || '222222222222';

            printer.println(`Cliente: ${clientName}`);
            printer.println(`RUC/CI:  ${clientId}`);
            if (customerData?.address) printer.println(`Dir:     ${customerData.address}`);
            if (customerData?.phone) printer.println(`Tel:     ${customerData.phone}`);
            printer.drawLine();

            // 5. ITEMS (Tabla - Formato Manual para mayor seguridad)
            // Ancho total: 48 caracteres
            // Col 1: Cant (5)
            // Col 2: Detalle (22)
            // Col 3: Iva (9)
            // Col 4: Total (12)

            const formatRow = (cant, detalle, iva, total) => {
                const c1 = cant.toString().padEnd(5).substring(0, 5);
                const c2 = detalle.padEnd(22).substring(0, 22);
                const c3 = iva.padEnd(9).substring(0, 9);
                const c4 = total.padStart(12).substring(0, 12);
                return `${c1}${c2}${c3}${c4}`;
            };

            printer.bold(true);
            printer.println(formatRow("Cant", "Detalle", "Iva", "Total"));
            printer.bold(false);
            printer.drawLine();

            items.forEach(item => {
                printer.println(formatRow(
                    String(item.quantity),
                    item.description,
                    "INC 15%",
                    `$${item.subtotal.toFixed(2)}`
                ));
            });
            printer.drawLine();

            // 6. TOTALES
            printer.alignRight();
            printer.println(`Subtotal:   $${subtotal.toFixed(2)}`);
            printer.println(`Iva 15%:    $${(total - subtotal).toFixed(2)}`);
            printer.bold(true);
            printer.setTextSize(1, 1);
            printer.println(`Total:      $${total.toFixed(2)}`);
            printer.newLine();

            // 7. FORMA DE PAGO
            printer.alignLeft();
            const paymentMethodMap = {
                'cash': 'EFECTIVO',
                'card': 'TARJETA DE CRÉDITO/DÉBITO',
                'transfer': 'TRANSFERENCIA BANCARIA'
            };
            printer.println(`FORMA DE PAGO: ${paymentMethodMap[receiptData.paymentMethod] || 'OTRO'}`);

            if (receiptData.paymentMethod === 'cash' && receiptData.amountReceived) {
                printer.println(`RECIBIDO:      $${Number(receiptData.amountReceived).toFixed(2)}`);
                printer.println(`CAMBIO:        $${Number(receiptData.change || 0).toFixed(2)}`);
            }

            printer.newLine();
            printer.printQR("https://www.instagram.com/mafercano.pro/", {
                cellSize: 6, // Tamaño del módulo (3-8)
                correction: 'M', // Nivel de corrección (L, M, Q, H)
                model: 2 // Modelo QR
            });
            printer.newLine();

            // 10. SOFTWARE INFO
            printer.println('ionosHub Software');
            printer.println('ionoshub.net');
            printer.println('Telf: 0992249152');

            printer.newLine();
            printer.newLine();
            printer.cut();

            // OBTENER BUFFER Y ENVIAR
            const buffer = printer.getBuffer();
            const tempFile = path.join(__dirname, 'receipt.bin');
            fs.writeFileSync(tempFile, buffer);

            console.log('📄 Ticket generado (binario) en:', tempFile);
            console.log(`🖨️  Enviando a impresora: ${PRINTER_NAME}...`);

            // Usar script de PowerShell para enviar RAW bytes
            const psScript = path.join(__dirname, 'print-raw.ps1');
            const command = `powershell -ExecutionPolicy Bypass -File "${psScript}" "${PRINTER_NAME}" "${tempFile}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Error al imprimir:', error);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.warn('⚠️ Advertencia PowerShell:', stderr);
                }
                console.log('✅ Comando de impresión enviado exitosamente');
                resolve({ success: true });
            });

        } catch (error) {
            console.error('❌ Error crítico generando ticket:', error);
            reject(error);
        }
    });
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/print') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const receiptData = JSON.parse(body);
                console.log('📥 Recibida solicitud de impresión');
                await printReceipt(receiptData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('❌ Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', printer: PRINTER_NAME }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`
=================================================
🖨️  SERVIDOR DE IMPRESIÓN (ESC/POS RAW)
=================================================
📍 Puerto:    ${PORT}
🖨️  Impresora: ${PRINTER_NAME}
✅ Listo para recibir trabajos
=================================================
`);
});
