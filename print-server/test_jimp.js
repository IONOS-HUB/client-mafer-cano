const Jimp = require('jimp');
console.log('Type of Jimp:', typeof Jimp);
console.log('Keys of Jimp:', Object.keys(Jimp));
console.log('Is read a function?', typeof Jimp.read);
try {
    const { Jimp: JimpClass } = require('jimp');
    console.log('Type of JimpClass:', typeof JimpClass);
    if (JimpClass) console.log('Is read a function on JimpClass?', typeof JimpClass.read);
} catch (e) {
    console.log('Destructuring failed');
}
