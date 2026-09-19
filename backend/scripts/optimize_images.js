const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const assetsDir = path.join(root, 'frontend/public/assets');

async function getFiles(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function run() {
  console.log('--- JMT TRAVELS IMAGE OPTIMIZATION PASS ---');
  console.log('Target directory:', assetsDir);

  const allFiles = await getFiles(assetsDir);
  const imageFiles = allFiles.filter(f => /\.(jpe?g|png)$/i.test(f) && !f.endsWith('.webp'));

  console.log(`Found ${imageFiles.length} raster images to optimize.`);

  let totalBeforeBytes = 0;
  let totalAfterJpgBytes = 0;
  let totalWebpBytes = 0;

  for (const file of imageFiles) {
    const rel = path.relative(assetsDir, file);
    const stat = fs.statSync(file);
    const beforeSize = stat.size;
    totalBeforeBytes += beforeSize;

    try {
      // Read completely into buffer to prevent Windows file lock collisions
      const inputBuffer = fs.readFileSync(file);
      const image = sharp(inputBuffer);
      const meta = await image.metadata();

      const isHero = /hero/i.test(file);
      const isLogo = /logo/i.test(file);
      const maxWidth = isHero ? 1440 : (isLogo ? 512 : 1200);

      // 1. Generate optimized JPEG / PNG in-place
      let pipeline = sharp(inputBuffer);
      if (meta.width > maxWidth) {
        pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
      }

      let optimizedBuffer;
      if (/\.png$/i.test(file)) {
        optimizedBuffer = await pipeline
          .png({ quality: 85, compressionLevel: 9, palette: true })
          .toBuffer();
      } else {
        optimizedBuffer = await pipeline
          .jpeg({ quality: 82, progressive: true, mozjpeg: true })
          .toBuffer();
      }

      // Overwrite original file with optimized version only if smaller
      if (optimizedBuffer.length < beforeSize) {
        fs.writeFileSync(file, optimizedBuffer);
        totalAfterJpgBytes += optimizedBuffer.length;
      } else {
        totalAfterJpgBytes += beforeSize;
      }

      // 2. Generate modern .webp sibling file
      const webpPath = file.replace(/\.(jpe?g|png)$/i, '.webp');
      let webpPipeline = sharp(inputBuffer);
      if (meta.width > maxWidth) {
        webpPipeline = webpPipeline.resize({ width: maxWidth, withoutEnlargement: true });
      }
      const webpBuffer = await webpPipeline
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      fs.writeFileSync(webpPath, webpBuffer);
      totalWebpBytes += webpBuffer.length;

      const afterSize = fs.statSync(file).size;
      const webpSize = webpBuffer.length;
      const savingsPct = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);

      console.log(`✓ ${rel}: ${(beforeSize / 1024).toFixed(1)} KB -> ${(afterSize / 1024).toFixed(1)} KB (-${savingsPct}%) | WebP: ${(webpSize / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`✗ Error optimizing ${rel}:`, err.message);
      totalAfterJpgBytes += beforeSize;
    }
  }

  console.log('\n=================================================');
  console.log('IMAGE OPTIMIZATION SUMMARY');
  console.log('=================================================');
  console.log(`Original Total:   ${(totalBeforeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Optimized Total:  ${(totalAfterJpgBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total WebP Files: ${(totalWebpBytes / 1024 / 1024).toFixed(2)} MB`);
  const totalSaved = totalBeforeBytes - totalAfterJpgBytes;
  console.log(`Total Saved:      ${(totalSaved / 1024 / 1024).toFixed(2)} MB (${((totalSaved / totalBeforeBytes) * 100).toFixed(1)}% reduction)`);
  console.log('=================================================');
}

run().catch(err => {
  console.error('Fatal error in image optimization:', err);
  process.exit(1);
});
