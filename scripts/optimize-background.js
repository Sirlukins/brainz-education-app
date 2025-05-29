import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get current file path and directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL = 'https://od.lk/s/NjBfMTc2MjQ2ODczXw/home%20page%20background.png';
const OUTPUT_PATH = path.join(__dirname, '../client/public/images/');
const WEBP_OUTPUT = path.join(OUTPUT_PATH, 'background.webp');
const TEMP_FILE = path.join(OUTPUT_PATH, 'temp-background.png');

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

async function optimizeBackground() {
  console.log('Downloading background image...');
  
  // First, download the image to a temporary file
  const file = fs.createWriteStream(TEMP_FILE);
  
  await new Promise((resolve, reject) => {
    https.get(SOURCE_URL, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlinkSync(TEMP_FILE);
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlinkSync(TEMP_FILE);
      reject(err);
    });
  });
  
  console.log('Image downloaded, optimizing...');
  
  // Now optimize the image with sharp
  try {
    await sharp(TEMP_FILE)
      .webp({ quality: 80 }) // Use WebP format with 80% quality
      .toFile(WEBP_OUTPUT);
      
    console.log(`Background optimized and saved to ${WEBP_OUTPUT}`);
    
    // Clean up the temporary file
    fs.unlinkSync(TEMP_FILE);
    
    console.log('✓ Background image optimization complete!');
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Clean up on error
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
    }
  }
}

optimizeBackground().catch(console.error);