import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const [libraryRoot, outputRoot] = process.argv.slice(2);
if (!libraryRoot || !outputRoot) {
  throw new Error(
    "Usage: node scripts/generate-pilot-festival-hero-contact-sheets.mjs <library-root> <output-root>"
  );
}

const index = JSON.parse(
  await fs.readFile(path.join(libraryRoot, "pilot-index.json"), "utf8")
);
const variants = index.groups.flatMap((group) =>
  group.variants.map((variant) => ({ ...variant, festivalName: group.festivalName, groupSlug: group.slug }))
);

async function createSheet({ filename, assetName, cellWidth, cellHeight, columns }) {
  const labelHeight = 38;
  const rows = Math.ceil(variants.length / columns);
  const cells = await Promise.all(
    variants.map(async (variant, indexPosition) => {
      const image = await sharp(
        path.join(libraryRoot, variant.groupSlug, variant.slug, assetName)
      )
        .resize(cellWidth, cellHeight, { fit: "cover", position: "centre" })
        .webp({ quality: 84 })
        .toBuffer();
      const label = `${variant.festivalName} - ${variant.name}`
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      const labelImage = await sharp({
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
              `<svg width="${cellWidth}" height="${labelHeight}"><text x="12" y="25" fill="#ffffff" font-family="Arial" font-size="14">${label}</text></svg>`
            )
          }
        ])
        .webp({ quality: 88 })
        .toBuffer();
      return { indexPosition, image, labelImage };
    })
  );
  await fs.mkdir(outputRoot, { recursive: true });
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * (cellHeight + labelHeight),
      channels: 3,
      background: "#eef1f7"
    }
  })
    .composite(
      cells.flatMap(({ indexPosition, image, labelImage }) => {
        const left = (indexPosition % columns) * cellWidth;
        const top = Math.floor(indexPosition / columns) * (cellHeight + labelHeight);
        return [
          { input: labelImage, left, top },
          { input: image, left, top: top + labelHeight }
        ];
      })
    )
    .jpeg({ quality: 90 })
    .toFile(path.join(outputRoot, filename));
}

await createSheet({
  filename: "pilot-desktop-variants.jpg",
  assetName: "preview-desktop.webp",
  cellWidth: 480,
  cellHeight: 270,
  columns: 2
});
await createSheet({
  filename: "pilot-mobile-variants.jpg",
  assetName: "preview-mobile.webp",
  cellWidth: 390,
  cellHeight: 260,
  columns: 2
});

console.log(
  JSON.stringify(
    {
      variants: variants.length,
      desktop: path.join(outputRoot, "pilot-desktop-variants.jpg"),
      mobile: path.join(outputRoot, "pilot-mobile-variants.jpg")
    },
    null,
    2
  )
);
