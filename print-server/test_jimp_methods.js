const { Jimp } = require('jimp');
const path = require('path');

async function test() {
    try {
        // Crear una imagen simple
        const image = new Jimp({ width: 100, height: 100, color: 0xFF0000FF });

        console.log('Métodos disponibles en la instancia de imagen:');
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(image));
        console.log(methods.filter(m => m.includes('write') || m.includes('save')));

        // Intentar guardar
        try {
            await image.write('test.png');
            console.log('write() funcionó');
        } catch (e) { console.log('write() falló'); }

        try {
            await image.writeAsync('test_async.png');
            console.log('writeAsync() funcionó');
        } catch (e) { console.log('writeAsync() falló'); }

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
