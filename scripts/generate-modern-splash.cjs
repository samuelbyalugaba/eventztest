const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const RES_DIR = path.join(ROOT, 'android/app/src/main/res');
const LOGO = path.join(ROOT, 'src/assets/auth-logo-black.png');
const ICON_OUTPUT = path.join(RES_DIR, 'drawable/splash_icon.png');

const PALETTES = {
  light: {
    background: '#FAFAFA',
    accent: '#8A2BE2',
    line: '#8A2BE2',
    shadow: 'rgba(21, 16, 32, 0.18)',
  },
  dark: {
    background: '#101014',
    accent: '#8A2BE2',
    line: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.34)',
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const collectSplashFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSplashFiles(fullPath);
    return entry.name === 'splash.png' ? [fullPath] : [];
  });
};

const svg = (markup) => Buffer.from(markup);

const makeBackground = (width, height, dark) => {
  const palette = dark ? PALETTES.dark : PALETTES.light;
  const strokeWidth = clamp(Math.round(Math.min(width, height) * 0.003), 1, 5);
  const lineOpacity = dark ? 0.09 : 0.08;

  return svg(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${palette.background}"/>
      <g fill="none" stroke="${palette.line}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${lineOpacity}">
        <path d="M ${-width * 0.08} ${height * 0.23} C ${width * 0.18} ${height * 0.16}, ${width * 0.32} ${height * 0.28}, ${width * 0.54} ${height * 0.20} S ${width * 0.86} ${height * 0.13}, ${width * 1.08} ${height * 0.21}"/>
        <path d="M ${-width * 0.10} ${height * 0.78} C ${width * 0.18} ${height * 0.70}, ${width * 0.35} ${height * 0.86}, ${width * 0.58} ${height * 0.77} S ${width * 0.88} ${height * 0.67}, ${width * 1.12} ${height * 0.76}"/>
      </g>
      <g fill="${palette.accent}" opacity="${dark ? 0.12 : 0.10}">
        <rect x="${width * 0.12}" y="${height * 0.13}" width="${width * 0.16}" height="${strokeWidth}" rx="${strokeWidth / 2}"/>
        <rect x="${width * 0.70}" y="${height * 0.83}" width="${width * 0.18}" height="${strokeWidth}" rx="${strokeWidth / 2}"/>
      </g>
    </svg>
  `);
};

const makeWhiteLogo = async (logoSize) => {
  const alpha = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(logoSize * logoSize * 4);
  for (let i = 0; i < alpha.length; i += 1) {
    const offset = i * 4;
    rgba[offset] = 255;
    rgba[offset + 1] = 255;
    rgba[offset + 2] = 255;
    rgba[offset + 3] = alpha[i];
  }

  return sharp(rgba, {
    raw: {
      width: logoSize,
      height: logoSize,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
};

const makeTile = async (tileSize, logoScale = 0.72) => {
  const radius = Math.round(tileSize * 0.22);
  const logoSize = Math.round(tileSize * logoScale);
  const logo = await makeWhiteLogo(logoSize);

  const tile = await sharp(svg(`
      <svg width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${tileSize}" height="${tileSize}" rx="${radius}" fill="#8A2BE2"/>
        <rect x="1" y="1" width="${tileSize - 2}" height="${tileSize - 2}" rx="${Math.max(radius - 1, 1)}" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="2"/>
      </svg>
    `))
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: tileSize,
      height: tileSize,
      channels: 4,
      background: 'rgba(0,0,0,0)',
    },
  })
    .composite([
      { input: tile, left: 0, top: 0 },
      { input: logo, left: Math.round((tileSize - logoSize) / 2), top: Math.round((tileSize - logoSize) / 2) },
    ])
    .png()
    .toBuffer();
};

const makeShadow = async (tileSize, dark) => {
  const padding = Math.round(tileSize * 0.16);
  const size = tileSize + padding * 2;
  const radius = Math.round(tileSize * 0.24);
  const palette = dark ? PALETTES.dark : PALETTES.light;

  return sharp(svg(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${padding}" y="${padding}" width="${tileSize}" height="${tileSize}" rx="${radius}" fill="${palette.shadow}"/>
      </svg>
    `))
    .blur(Math.max(4, Math.round(tileSize * 0.055)))
    .png()
    .toBuffer();
};

const makeSplash = async (filePath) => {
  const inputMeta = await sharp(filePath).metadata();
  const { width, height } = inputMeta;
  const dark = filePath.includes('-night');
  const tileSize = clamp(Math.round(Math.min(width, height) * 0.28), 92, Math.round(Math.min(width, height) * 0.36));
  const shadowPad = Math.round(tileSize * 0.16);
  const mark = await makeTile(tileSize);
  const shadow = await makeShadow(tileSize, dark);
  const left = Math.round((width - tileSize) / 2);
  const top = Math.round((height - tileSize) / 2);

  await sharp(makeBackground(width, height, dark))
    .composite([
      { input: shadow, left: left - shadowPad, top: top - shadowPad + Math.round(tileSize * 0.04) },
      { input: mark, left, top },
    ])
    .png()
    .toFile(filePath);
};

const makeSplashIcon = async () => {
  const canvas = 288;
  const tileSize = 190;
  const mark = await makeTile(tileSize, 0.70);
  await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: 'rgba(0,0,0,0)',
    },
  })
    .composite([{ input: mark, left: Math.round((canvas - tileSize) / 2), top: Math.round((canvas - tileSize) / 2) }])
    .png()
    .toFile(ICON_OUTPUT);
};

async function main() {
  if (!fs.existsSync(LOGO)) {
    throw new Error(`Missing logo: ${LOGO}`);
  }

  const splashFiles = collectSplashFiles(RES_DIR);
  await Promise.all(splashFiles.map(makeSplash));
  await makeSplashIcon();
  console.log(`Generated ${splashFiles.length} splash backgrounds and ${path.relative(ROOT, ICON_OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
