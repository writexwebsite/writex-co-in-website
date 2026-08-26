import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  throw new Error(
    "Usage: node scripts/build-independence-day-designer-pack-v2.mjs <Design 2.png> <output-dir>"
  );
}

const input = resolve(inputArg);
const outputDir = resolve(outputArg);
const source = await sharp(input, { limitInputPixels: false }).metadata();
if (source.width !== 1448 || source.height !== 1086) {
  throw new Error(
    `Expected the approved 1448x1086 Design 2 source, received ${source.width}x${source.height}.`
  );
}

// The approved artwork ends before the mock login card. Only this visual region
// is promoted; the real application form remains the sole rendered form.
const artworkWidth = 884;
const artwork = await sharp(input, { limitInputPixels: false })
  .extract({ left: 0, top: 0, width: artworkWidth, height: source.height })
  .png()
  .toBuffer();

const variants = [
  { name: "background-4x3-8k.webp", width: 7680, height: 5760 },
  { name: "background-wide-8k.webp", width: 7680, height: 4320 },
  { name: "background-ultrawide-8k.webp", width: 8192, height: 3888 }
];

await mkdir(outputDir, { recursive: true });
const results = [];

for (const variant of variants) {
  const scaledArtworkWidth = Math.round(
    (artworkWidth / source.height) * variant.height
  );
  const fadeWidth = Math.max(420, Math.round(scaledArtworkWidth * 0.14));
  const fadeStart = Math.max(0, scaledArtworkWidth - fadeWidth);
  // Rebuild the card-covered area as a clean atmospheric continuation. This
  // deliberately avoids stretching or blurring the artwork across the form.
  const naturalCanvas = Buffer.from(`
    <svg width="${variant.width}" height="${variant.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d3d0d0"/>
          <stop offset="0.48" stop-color="#eee5e0"/>
          <stop offset="0.72" stop-color="#fbf5ef"/>
          <stop offset="1" stop-color="#fffaf5"/>
        </linearGradient>
        <radialGradient id="light" cx="0.72" cy="0.42" r="0.72">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="saffron" cx="0.7" cy="0.08" r="0.72">
          <stop offset="0" stop-color="#f7b37f" stop-opacity="0.18"/>
          <stop offset="1" stop-color="#f7b37f" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="green" cx="0.82" cy="0.96" r="0.72">
          <stop offset="0" stop-color="#79aa82" stop-opacity="0.15"/>
          <stop offset="1" stop-color="#79aa82" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#base)"/>
      <rect width="100%" height="100%" fill="url(#light)"/>
      <rect width="100%" height="100%" fill="url(#saffron)"/>
      <rect width="100%" height="100%" fill="url(#green)"/>
    </svg>
  `);
  const resizedArtwork = await sharp(artwork, { limitInputPixels: false })
    .resize({
      width: scaledArtworkWidth,
      height: variant.height,
      fit: "fill",
      kernel: sharp.kernel.lanczos3
    })
    .sharpen({ sigma: 0.85, m1: 0.45, m2: 1.25 })
    .png()
    .toBuffer();
  const fadedArtwork = await sharp(resizedArtwork, {
    limitInputPixels: false
  })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${scaledArtworkWidth}" height="${variant.height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="alpha" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="white" stop-opacity="1"/>
                <stop offset="${fadeStart / scaledArtworkWidth}" stop-color="white" stop-opacity="1"/>
                <stop offset="1" stop-color="white" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#alpha)"/>
          </svg>
        `),
        blend: "dest-in"
      }
    ])
    .png()
    .toBuffer();
  const output = join(outputDir, variant.name);
  const result = await sharp(naturalCanvas, { limitInputPixels: false })
    .composite([
      { input: fadedArtwork, left: 0, top: 0 }
    ])
    .webp({
      quality: 92,
      alphaQuality: 100,
      smartSubsample: true,
      effort: 6
    })
    .withMetadata()
    .toFile(output);
  const hash = createHash("sha256")
    .update(await readFile(output))
    .digest("hex");

  results.push({
    file: basename(output),
    width: result.width,
    height: result.height,
    bytes: result.size,
    sha256: hash
  });
}

const sourceHash = createHash("sha256")
  .update(await readFile(input))
  .digest("hex");

process.stdout.write(
  `${JSON.stringify(
    {
      source: {
        file: basename(input),
        width: source.width,
        height: source.height,
        sha256: sourceHash
      },
      mockFormExcludedAtSourceX: artworkWidth,
      variants: results
    },
    null,
    2
  )}\n`
);
