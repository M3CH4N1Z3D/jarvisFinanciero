const sharp = require('sharp');

async function convertImage() {
  try {
    await sharp('assets/ICONO.jpeg')
      .toFormat('png')
      .toFile('assets/icon.png');
    console.log('Conversion successful');
  } catch (error) {
    console.error('Error converting image:', error);
  }
}

convertImage();
