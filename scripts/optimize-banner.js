import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeBanner() {
  const inputPath = path.join(__dirname, '../client/public/images/title-banner-original.png');
  const outputPath = path.join(__dirname, '../client/public/images/title-banner.webp');
  
  try {
    // Create WebP version with good quality but smaller size
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    console.log('Banner image optimized successfully!');
    
    // Get file sizes for comparison
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    
    console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Reduction: ${(100 - (optimizedSize / originalSize * 100)).toFixed(2)}%`);
  } catch (error) {
    console.error('Error optimizing banner:', error);
  }
}

optimizeBanner();