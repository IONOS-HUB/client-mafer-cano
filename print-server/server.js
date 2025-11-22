const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const { Jimp } = require('jimp');

const PORT = 3001;
const PRINTER_NAME = "POSPrinter POS-80C"; // Nombre exacto de tu impresora en Windows

// Rutas de imágenes originales
const LOGO_PATH = path.join(__dirname, '../public/logo/mafercano.png');
const QR_PATH = path.join(__dirname, '../public/qr/qrMafer.png');

// Función para redimensionar imagen y guardar temporalmente
async function prepareImage(imagePath, targetWidth = 350) {
    try {
        if (!fs.existsSync(imagePath)) return null;

        const image = await Jimp.read(imagePath);

        // Si la imagen ya es pequeña, usarla tal cual
        if (image.bitmap.width <= targetWidth) return imagePath;

        // Redimensionar manteniendo aspecto (nueva sintaxis Jimp v1.0+)
        image.resize({ w: targetWidth });

        const tempPath = path.join(__dirname, `temp_${path.basename(imagePath)}`);

        // Usar getBuffer y fs para asegurar compatibilidad
        const buffer = await image.getBuffer("image/png");
        fs.writeFileSync(tempPath, buffer);

        return tempPath;
    } catch (error) {
        console.error('Error procesando imagen:', error);
        return null;
    }
}

function printReceipt(receiptData) {
    return new Promise(async (resolve, reject) => {
        try {
            const printer = new ThermalPrinter({
                type: PrinterTypes.EPSON, // ESC/POS standard
                interface: 'tcp://localhost:9100', // Dummy interface
                width: 48, // 48 caracteres para 80mm
                characterSet: CharacterSet.PC858_EURO, // Mejor soporte para español
                removeSpecialCharacters: false,
                lineCharacter: "=" // Caracter para líneas separadoras
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

            // 1. LOGO (Redimensionado a 700px)
            printer.alignCenter();
            const logoTemp = await prepareImage(LOGO_PATH, 450);
            if (logoTemp) {
                await printer.printImage(logoTemp);
                printer.newLine();
                // Limpiar temporal si es diferente al original
                if (logoTemp !== LOGO_PATH) try { fs.unlinkSync(logoTemp); } catch (e) { }
            }

            // ENCABEZADO (Sin nombre repetido, solo datos fiscales)
            printer.bold(false);
            printer.setTextSize(0, 0); // Normal

            if (businessInfo.ruc) printer.println(`RUC: ${businessInfo.ruc}`);
            if (businessInfo.address) printer.println(businessInfo.address);
            if (businessInfo.phone) printer.println(`Tel: ${businessInfo.phone}`);
            printer.drawLine();

            // 2. DATOS FACTURA
            printer.bold(true);
            printer.println('FACTURA ELECTRONICA DE VENTA');
            printer.setTextSize(0, 0);
            printer.println(`No. ${invoiceNumber}`);
            printer.bold(false);
            printer.println(`Fecha: ${date}`);
            printer.drawLine();

            // 3. CLIENTE
            printer.alignLeft();
            const clientName = customerData?.business_name || customerData?.name || 'CONSUMIDOR FINAL';
            const clientId = customerData?.identification || '9999999999999';

            printer.println(`Cliente: ${clientName}`);
            printer.println(`RUC/CI:  ${clientId}`);
            if (customerData?.address) printer.println(`Dir:     ${customerData.address}`);
            if (customerData?.phone) printer.println(`Tel:     ${customerData.phone}`);
            printer.drawLine();

            // 4. ITEMS (Tabla Manual)
            // Ancho: 48 chars
            // Cant(5) Detalle(27) Total(14)

            printer.bold(true);
            printer.tableCustom([
                { text: "CANT", align: "LEFT", width: 0.10 },
                { text: "DETALLE", align: "LEFT", width: 0.60 },
                { text: "TOTAL", align: "RIGHT", width: 0.25 }
            ]);
            printer.bold(false);
            printer.drawLine();

            items.forEach(item => {
                printer.tableCustom([
                    { text: String(item.quantity), align: "LEFT", width: 0.10 },
                    { text: item.description.substring(0, 28), align: "LEFT", width: 0.60 },
                    { text: `$${item.subtotal.toFixed(2)}`, align: "RIGHT", width: 0.25 }
                ]);
            });
            printer.drawLine();

            // 5. TOTALES
            printer.alignRight();
            printer.println(`Subtotal:   $${subtotal.toFixed(2)}`);
            printer.println(`Iva 15%:    $${(total - subtotal).toFixed(2)}`);

            printer.newLine();
            printer.bold(true);
            printer.setTextSize(1, 1); // Doble tamaño para TOTAL
            printer.println(`TOTAL: $${total.toFixed(2)}`);
            printer.setTextSize(0, 0);
            printer.bold(false);
            printer.newLine();

            // 6. FORMA DE PAGO
            printer.alignLeft();
            const paymentMethodMap = {
                'cash': 'EFECTIVO',
                'card': 'TARJETA',
                'transfer': 'TRANSFERENCIA'
            };
            printer.println(`FORMA DE PAGO: ${paymentMethodMap[paymentMethod] || 'OTRO'}`);

            if (paymentMethod === 'cash' && receiptData.amountReceived) {
                printer.println(`RECIBIDO:      $${Number(receiptData.amountReceived).toFixed(2)}`);
                printer.println(`CAMBIO:        $${Number(receiptData.change || 0).toFixed(2)}`);
            }

            printer.newLine();

            // 7. QR DE REDES SOCIALES (Redimensionado)
            printer.alignCenter();
            const qrTemp = await prepareImage(QR_PATH, 250); // QR un poco más pequeño para asegurar nitidez
            if (qrTemp) {
                await printer.printImage(qrTemp);
                printer.newLine();
                // Limpiar temporal
                if (qrTemp !== QR_PATH) try { fs.unlinkSync(qrTemp); } catch (e) { }
            }

            // PIE DE PÁGINA
            printer.println('ionosHub Software');
            printer.println('ionoshub.net - 0992249152');
            printer.newLine();
            printer.println('GRACIAS POR SU COMPRA');

            printer.newLine();
            printer.newLine();
            printer.cut();

            // OBTENER BUFFER Y ENVIAR
            const buffer = printer.getBuffer();
            const tempFile = path.join(__dirname, 'receipt.bin');
            fs.writeFileSync(tempFile, buffer);

            console.log('📄 Ticket generado (binario ESC/POS) en:', tempFile);
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
