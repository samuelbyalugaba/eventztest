
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ICON = path.resolve(__dirname, '../public/icons/source.png');
const OUTPUT_DIR = path.resolve(__dirname, '../public/icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('Error: Source icon not found at public/icons/source.png');
    console.log('Please save your icon image as "source.png" in the "public/icons" folder.');
    process.exit(1);
  }

  console.log('Generating PWA icons...');

  try {
    // Generate PNGs
    for (const size of SIZES) {
      await sharp(SOURCE_ICON)
        .resize(size, size)
        .toFile(path.join(OUTPUT_DIR, `icon-${size}x${size}.png`));
      console.log(`Generated icon-${size}x${size}.png`);
    }

    // Generate favicon.ico (32x32)
    await sharp(SOURCE_ICON)
      .resize(32, 32)
      .toFile(path.join(OUTPUT_DIR, '../favicon.ico'));
    console.log('Generated favicon.ico');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
