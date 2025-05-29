import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixHiddenPremiseBadge() {
  const inputPath = path.join(__dirname, '..', 'public', 'badges', 'hidden-premise-badge.png');
  const thumbnailPath = path.join(__dirname, '..', 'public', 'badges', 'thumbnails', 'hidden-premise-badge.webp');
  const optimizedPath = path.join(__dirname, '..', 'public', 'badges', 'optimized-hidden-premise-badge.webp');
  
  try {
    console.log(`Processing ${inputPath}`);
    
    // Create thumbnail
    await sharp(inputPath)
      .resize(160, 160, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({ quality: 85 })
      .toFile(thumbnailPath);
    
    // Create optimized version
    await sharp(inputPath)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 90 })
      .toFile(optimizedPath);
    
    console.log('Successfully fixed hidden-premise-badge');
  } catch (err) {
    console.error('Error fixing badge:', err);
  }
}

// Run the function
fixHiddenPremiseBadge();