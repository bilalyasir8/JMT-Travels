const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets');
const hotelsDir = path.join(baseDir, 'hotels');
const destsDir = path.join(baseDir, 'destinations');

// Available base sample images
const sampleImages = [
  path.join(destsDir, 'salalah_1.jpg'),
  path.join(destsDir, 'salalah_2.jpg'),
  path.join(destsDir, 'salalah_3.jpg'),
  path.join(destsDir, 'salalah_4.jpg'),
  path.join(destsDir, 'dubai_1.jpg'),
  path.join(destsDir, 'dubai_2.jpg'),
  path.join(destsDir, 'dubai_3.jpg'),
  path.join(destsDir, 'dubai_4.jpg'),
  path.join(destsDir, 'umrah_1.jpg'),
  path.join(destsDir, 'umrah_2.jpg'),
  path.join(destsDir, 'umrah_3.jpg'),
  path.join(destsDir, 'umrah_4.jpg'),
  path.join(hotelsDir, 'luxury-resorts.jpg'),
  path.join(hotelsDir, 'group-bookings.jpg'),
  path.join(hotelsDir, 'umrah-stays.jpg'),
  path.join(hotelsDir, 'business-city-hotels.jpg')
].filter(p => fs.existsSync(p));

console.log(`Found ${sampleImages.length} base sample images.`);

const cityMap = [
  { slug: 'muscat', prefix: 'h-mct' },
  { slug: 'salalah', prefix: 'h-sll' },
  { slug: 'nizwa', prefix: 'h-nzw' },
  { slug: 'sohar', prefix: 'h-soh' },
  { slug: 'dubai', prefix: 'h-dxb' },
  { slug: 'abu-dhabi', prefix: 'h-auh' },
  { slug: 'al-ain', prefix: 'h-aan' },
  { slug: 'sharjah', prefix: 'h-shj' },
  { slug: 'makkah', prefix: 'h-mkk' },
  { slug: 'madinah', prefix: 'h-med' }
];

let totalGenerated = 0;

cityMap.forEach((city, cityIdx) => {
  const targetFolder = path.join(hotelsDir, city.slug);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  for (let i = 1; i <= 15; i++) {
    const padNum = String(i).padStart(2, '0');
    const hotelId = `${city.prefix}-${padNum}`;
    const targetFile = path.join(targetFolder, `${hotelId}.jpg`);

    // Pick sample image based on city and index to ensure variety
    const sampleIdx = (cityIdx * 15 + (i - 1)) % sampleImages.length;
    const srcImage = sampleImages[sampleIdx];

    fs.copyFileSync(srcImage, targetFile);
    totalGenerated++;
  }
});

console.log(`Successfully generated ${totalGenerated} hotel image assets across 10 city directories.`);
