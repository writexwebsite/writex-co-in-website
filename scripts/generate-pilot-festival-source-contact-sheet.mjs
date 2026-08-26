import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const [sourceRoot, destination] = process.argv.slice(2);

if (!sourceRoot || !destination) {
  throw new Error(
    "Usage: node scripts/generate-pilot-festival-source-contact-sheet.mjs <source-root> <destination>"
  );
}

async function collectPngFiles(root, relative = "") {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await collectPngFiles(root, next)));
    else if (/\.png$/i.test(entry.name)) files.push(next);
  }
  return files;
}

const candidates = (await collectPngFiles(sourceRoot))
  .filter((name) =>
    name.includes(path.sep)
      ? true
      : /^(christmas|Independence Day).+\.png$/i.test(name)
  )
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

const cellWidth = 480;
const imageHeight = 360;
const labelHeight = 42;
const columns = 2;
const rows = Math.ceil(candidates.length / columns);

const cells = await Promise.all(
  candidates.map(async (name, index) => {
    const image = await sharp(path.join(sourceRoot, name))
      .resize(cellWidth, imageHeight, { fit: "cover", position: "centre" })
      .jpeg({ quality: 84 })
      .toBuffer();
    const escaped = name
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const label = await sharp({
      create: {
        width: cellWidth,
        height: labelHeight,
        channels: 3,
        background: "#0b1230"
      }
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${cellWidth}" height="${labelHeight}"><text x="14" y="27" fill="#ffffff" font-family="Arial" font-size="16">${escaped}</text></svg>`
          )
        }
      ])
      .jpeg({ quality: 90 })
      .toBuffer();
    return {
      index,
      image,
      label
    };
  })
);

const canvas = sharp({
  create: {
    width: cellWidth * columns,
    height: (imageHeight + labelHeight) * rows,
    channels: 3,
    background: "#eef1f7"
  }
});

await fs.mkdir(path.dirname(destination), { recursive: true });
await canvas
  .composite(
    cells.flatMap(({ index, image, label }) => {
      const left = (index % columns) * cellWidth;
      const top = Math.floor(index / columns) * (imageHeight + labelHeight);
      return [
        { input: label, left, top },
        { input: image, left, top: top + labelHeight }
      ];
    })
  )
  .jpeg({ quality: 90 })
  .toFile(destination);

console.log(JSON.stringify({ sourceImages: candidates.length, destination }, null, 2));
