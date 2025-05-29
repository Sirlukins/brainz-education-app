import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const badgesDir = path.join(__dirname, '..', 'public', 'badges');
const thumbnailsDir = path.join(badgesDir, 'thumbnails');

// Sizes for optimization
const THUMBNAIL_SIZE = 160; // 160x160 px
const MAX_FULL_SIZE = 800; // 800x800 px max for full images

async function optimizeBadges() {
  try {
    // Ensure thumbnails directory exists
    await fs.mkdir(thumbnailsDir, { recursive: true });
    
    // Get all PNG files
    const files = await fs.readdir(badgesDir);
    const pngFiles = files.filter(file => 
      file.endsWith('.png') && !file.includes('optimized') && !path.dirname(file).includes('thumbnails')
    );
    
    console.log(`Found ${pngFiles.length} badge images to optimize`);
    
    // Process each file
    for (const file of pngFiles) {
      const inputPath = path.join(badgesDir, file);
      const thumbnailPath = path.join(thumbnailsDir, file);
      const optimizedPath = path.join(badgesDir, `optimized-${file}`);
      
      try {
        // Create thumbnail version
        await sharp(inputPath)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .webp({ quality: 85 })
          .toFile(thumbnailPath.replace('.png', '.webp'));
        
        // Create optimized full-size version
        await sharp(inputPath)
          .resize(MAX_FULL_SIZE, MAX_FULL_SIZE, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 90 })
          .toFile(optimizedPath.replace('.png', '.webp'));
        
        console.log(`Successfully optimized ${file}`);
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
    
    console.log('Badge optimization complete!');
  } catch (err) {
    console.error('Error optimizing badges:', err);
  }
}

// Run the optimizer
optimizeBadges();