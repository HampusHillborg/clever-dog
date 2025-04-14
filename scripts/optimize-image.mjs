import sharp from 'sharp';
import { readFileSync, writeFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Input and output paths
const inputPath = resolve(__dirname, '../src/assets/images/gallery/social_walk.jpeg');
const outputPath = resolve(__dirname, '../src/assets/images/gallery/social_walk_optimized.jpeg');

async function optimizeImage() {
  try {
    // Get file stats before optimization
    const statsBefore = statSync(inputPath);
    console.log(`Original file size: ${(statsBefore.size / 1024 / 1024).toFixed(2)} MB`);

    // Optimize image
    await sharp(inputPath)
      .resize(1200) // Resize to max width of 1200px
      .jpeg({ quality: 80, mozjpeg: true }) // Use mozjpeg with 80% quality
      .toFile(outputPath);

    // Get file stats after optimization
    const statsAfter = statSync(outputPath);
    console.log(`Optimized file size: ${(statsAfter.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Size reduction: ${(100 - (statsAfter.size / statsBefore.size) * 100).toFixed(2)}%`);

    // Write the optimized file back to the original path (as a copy)
    console.log(`Optimized file saved to: ${outputPath}`);
    console.log(`To replace the original, rename the optimized file manually.`);
  } catch (error) {
    console.error('Error optimizing image:', error);
  }
}

optimizeImage(); 