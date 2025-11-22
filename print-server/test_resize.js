const { Jimp } = require('jimp');

async function test() {
    try {
        console.log('Jimp.AUTO:', Jimp.AUTO); // Ver si existe

        // Crear imagen en blanco para probar
        const image = new Jimp({ width: 1000, height: 1000, color: 0xFFFFFFFF });

        console.log('Intento 1: resize(width, height)');
        try {
            image.resize(500, -1); // -1 solía ser AUTO
            console.log('Exito Intento 1');
        } catch (e) {
            console.log('Fallo Intento 1:', e.message);
        }

        console.log('Intento 2: resize({ w: width })');
        try {
            image.resize({ w: 500 });
            console.log('Exito Intento 2');
        } catch (e) {
            console.log('Fallo Intento 2:', e.message);
        }

        console.log('Intento 3: resize({ w: width, h: auto })');
        try {
            image.resize({ w: 500, h: -1 }); // O tal vez sin h
            console.log('Exito Intento 3');
        } catch (e) {
            console.log('Fallo Intento 3:', e.message);
        }

    } catch (e) {
        console.error('Error general:', e);
    }
}

test();
