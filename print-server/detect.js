const escpos = require('escpos');
const USB = require('escpos-usb');

console.log('🔍 Buscando impresoras USB conectadas...');

try {
    // Intentar listar todos los dispositivos USB
    const devices = USB.findPrinter();

    if (devices && devices.length > 0) {
        console.log(`✅ Se encontraron ${devices.length} dispositivo(s):`);
        devices.forEach((device, index) => {
            console.log(`\n🖨️  Dispositivo #${index + 1}:`);
            console.log(`   • Vendor ID (VID): 0x${device.deviceDescriptor.idVendor.toString(16).toUpperCase()}`);
            console.log(`   • Product ID (PID): 0x${device.deviceDescriptor.idProduct.toString(16).toUpperCase()}`);
            console.log('   -------------------------');
        });
        console.log('\n💡 Para configurar una impresora específica, usa estos VID y PID en server.js');
    } else {
        console.log('❌ No se encontraron impresoras USB compatibles automáticamente.');
        console.log('⚠️  Asegúrate de que la impresora esté encendida y conectada.');
        console.log('⚠️  En Windows, puede ser necesario instalar el driver Zadig para reemplazar el driver del fabricante (libusb).');
    }
} catch (error) {
    console.error('❌ Error crítico al buscar dispositivos:', error);
    if (error.message.includes('usb.on is not a function')) {
        console.log('\n🔧 POSIBLE SOLUCIÓN:');
        console.log('Parece haber un conflicto de versiones con la librería USB.');
        console.log('Intenta reinstalar las dependencias con una versión específica de usb.');
    }
}
