import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  throw new Error("Usage: node scripts/upscale-login-hero-8k.mjs <input> <output.webp>");
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const source = await sharp(input).metadata();
if (!source.width || !source.height) {
  throw new Error("The uploaded hero dimensions could not be read.");
}

const width = 7680;
const height = Math.round((source.height / source.width) * width);
await mkdir(dirname(output), { recursive: true });

const result = await sharp(input, { limitInputPixels: false })
  .resize({
    width,
    height,
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
    withoutEnlargement: false
  })
  .sharpen({ sigma: 1, m1: 0.5, m2: 1.5 })
  .webp({
    quality: 100,
    alphaQuality: 100,
    nearLossless: true,
    smartSubsample: true,
    effort: 6
  })
  .withMetadata()
  .toFile(output);

process.stdout.write(
  `${JSON.stringify({
    source: {
      width: source.width,
      height: source.height,
      format: source.format
    },
    output: {
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.size
    }
  })}\n`
);
