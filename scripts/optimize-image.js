import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Input and output paths
const inputPath = 'src/assets/images/gallery/social_walk.jpeg';
const outputPath = 'src/assets/images/gallery/social_walk_optimized.jpeg';

async function optimizeImage() {
  try {
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file ${inputPath} does not exist`);
      return;
    }

    // Get file stats before optimization
    const statsBefore = fs.statSync(inputPath);
    console.log(`Original file size: ${(statsBefore.size / 1024 / 1024).toFixed(2)} MB`);

    // Optimize image
    await sharp(inputPath)
      .resize(1200) // Resize to max width of 1200px
      .jpeg({ quality: 80, mozjpeg: true }) // Use mozjpeg with 80% quality
      .toFile(outputPath);

    // Get file stats after optimization
    const statsAfter = fs.statSync(outputPath);
    console.log(`Optimized file size: ${(statsAfter.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Size reduction: ${(100 - (statsAfter.size / statsBefore.size) * 100).toFixed(2)}%`);

    // Replace the original file
    fs.unlinkSync(inputPath);
    fs.renameSync(outputPath, inputPath);
    console.log(`Original file replaced with optimized version`);
  } catch (error) {
    console.error('Error optimizing image:', error);
  }
}

optimizeImage(); 