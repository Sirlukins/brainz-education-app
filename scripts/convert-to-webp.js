import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path and directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '../client/public/images/background.png');
const OUTPUT_PATH = path.join(__dirname, '../client/public/images/background.webp');

console.log(`Converting ${INPUT_PATH} to WebP...`);

sharp(INPUT_PATH)
  .webp({ quality: 80 })
  .toFile(OUTPUT_PATH)
  .then(() => {
    console.log(`Successfully converted to WebP: ${OUTPUT_PATH}`);
  })
  .catch(err => {
    console.error('Error converting to WebP:', err);
  });