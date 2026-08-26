import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const [libraryRoot, outputDir] = process.argv.slice(2);
if (!libraryRoot || !outputDir) {
  console.error(
    "Usage: node scripts/generate-festival-hero-pack-contact-sheets.mjs <library-root> <output-dir>",
  );
  process.exit(1);
}

const escapeXml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const index = JSON.parse(await fs.readFile(path.join(libraryRoot, "index.json"), "utf8"));
await fs.mkdir(outputDir, { recursive: true });

async function makeSheet({ sourceName, outputName, width, height, columns }) {
  const labelHeight = 28;
  const gap = 6;
  const cells = [];
  for (const pack of index.packs) {
    const source = path.join(libraryRoot, pack.slug, sourceName);
    const image = await sharp(source)
      .resize(width, height, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${width}" height="${labelHeight}"><rect width="${width}" height="${labelHeight}" fill="#11152f"/><text x="8" y="19" fill="white" font-family="Arial" font-size="14">${escapeXml(pack.eventName)}</text></svg>`,
    );
    cells.push(
      await sharp({
        create: {
          width,
          height: height + labelHeight,
          channels: 3,
          background: "#ffffff",
        },
      })
        .composite([
          { input: label, left: 0, top: 0 },
          { input: image, left: 0, top: labelHeight },
        ])
        .jpeg({ quality: 86 })
        .toBuffer(),
    );
  }
  const rows = Math.ceil(cells.length / columns);
  const sheetWidth = columns * (width + gap) - gap;
  const sheetHeight = rows * (height + labelHeight + gap) - gap;
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 3,
      background: "#e5e7ef",
    },
  })
    .composite(
      cells.map((input, index) => ({
        input,
        left: (index % columns) * (width + gap),
        top: Math.floor(index / columns) * (height + labelHeight + gap),
      })),
    )
    .jpeg({ quality: 88 })
    .toFile(path.join(outputDir, outputName));
}

await makeSheet({
  sourceName: "preview-desktop.webp",
  outputName: "festival-hero-desktop-contact-sheet.jpg",
  width: 480,
  height: 270,
  columns: 3,
});
await makeSheet({
  sourceName: "preview-mobile.webp",
  outputName: "festival-hero-mobile-contact-sheet.jpg",
  width: 300,
  height: 200,
  columns: 4,
});

console.log(
  JSON.stringify({
    packs: index.packs.length,
    desktop: path.join(outputDir, "festival-hero-desktop-contact-sheet.jpg"),
    mobile: path.join(outputDir, "festival-hero-mobile-contact-sheet.jpg"),
  }),
);
