import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeImages() {
  try {
    const heroImage = path.join(__dirname, 'src/assets/images/hero/heroweb.webp');
    
    // Ensure output directory exists
    const outputDir = path.join(__dirname, 'src/assets/images/hero');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create small version (480px width)
    await sharp(heroImage)
      .resize({ width: 480 })
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, 'heroweb-small.webp'));
    console.log('Created heroweb-small.webp');
    
    // Create medium version (800px width)
    await sharp(heroImage)
      .resize({ width: 800 })
      .webp({ quality: 85 })
      .toFile(path.join(outputDir, 'heroweb-medium.webp'));
    console.log('Created heroweb-medium.webp');
    
    // Create optimized large version (1920px width, higher compression)
    await sharp(heroImage)
      .resize({ width: 1920 })
      .webp({ quality: 90, effort: 6 }) // Higher effort = better compression
      .toFile(path.join(outputDir, 'heroweb-large.webp'));
    console.log('Created heroweb-large.webp');
    
    console.log('Image optimization complete!');
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

optimizeImages(); 