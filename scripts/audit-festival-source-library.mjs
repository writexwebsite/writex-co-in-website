import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const [sourceDir, inventoryPath, outputDir] = process.argv.slice(2);

if (!sourceDir || !inventoryPath || !outputDir) {
  console.error(
    "Usage: node scripts/audit-festival-source-library.mjs <source-dir> <inventory.json> <output-dir>",
  );
  process.exit(1);
}

const escapeXml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const filenames = (await fs.readdir(sourceDir)).filter((filename) =>
  /\.(png|jpe?g|webp|avif)$/i.test(filename),
);

await fs.mkdir(outputDir, { recursive: true });

const exactHashes = new Map();
const visualHashes = new Map();
const records = [];

for (const filename of filenames) {
  const absolutePath = path.join(sourceDir, filename);
  const input = await fs.readFile(absolutePath);
  const exactHash = crypto.createHash("sha256").update(input).digest("hex");
  const visualBuffer = await sharp(input)
    .resize(32, 32, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  const visualHash = crypto.createHash("sha256").update(visualBuffer).digest("hex");
  const metadata = await sharp(input).metadata();
  const heroWidth = Math.max(1, Math.floor((metadata.width || 1) * 0.68));
  const heroVector = await sharp(input)
    .extract({ left: 0, top: 0, width: heroWidth, height: metadata.height || 1 })
    .resize(64, 48, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  exactHashes.set(exactHash, [...(exactHashes.get(exactHash) || []), filename]);
  visualHashes.set(visualHash, [...(visualHashes.get(visualHash) || []), filename]);
  records.push({ filename, exactHash, visualHash, heroVector });
}

const eventNames = Object.keys(inventory.events);
const cells = [];
const cellWidth = 608;
const cellHeight = 251;

for (const eventName of eventNames) {
  const normalizedEvent = eventName.toLowerCase();
  const client = filenames.find(
    (filename) =>
      filename.toLowerCase().startsWith(normalizedEvent) &&
      filename.toLowerCase().includes("client"),
  );
  const employee = filenames.find(
    (filename) =>
      filename.toLowerCase().startsWith(normalizedEvent) &&
      filename.toLowerCase().includes("employee"),
  );
  const sampleFiles = [client, employee].filter(Boolean);
  const composites = [];

  for (const [index, filename] of sampleFiles.entries()) {
    const image = await sharp(path.join(sourceDir, filename))
      .resize(300, 225, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    composites.push({ input: image, left: index * 304, top: 26 });
  }

  const label = Buffer.from(
    `<svg width="${cellWidth}" height="26"><rect width="${cellWidth}" height="26" fill="#11152f"/><text x="8" y="18" fill="white" font-family="Arial" font-size="14">${escapeXml(eventName)}</text></svg>`,
  );
  const cell = await sharp({
    create: {
      width: cellWidth,
      height: cellHeight,
      channels: 3,
      background: "#e9eaf2",
    },
  })
    .composite([{ input: label, left: 0, top: 0 }, ...composites])
    .jpeg({ quality: 84 })
    .toBuffer();
  cells.push(cell);
}

const columns = 3;
const rows = Math.ceil(cells.length / columns);
const contactSheetPath = path.join(outputDir, "festival-source-contact-sheet.jpg");
await sharp({
  create: {
    width: columns * 612,
    height: rows * 255,
    channels: 3,
    background: "#ffffff",
  },
})
  .composite(
    cells.map((input, index) => ({
      input,
      left: (index % columns) * 612,
      top: Math.floor(index / columns) * 255,
    })),
  )
  .jpeg({ quality: 86 })
  .toFile(contactSheetPath);

const repeatedExactGroups = [...exactHashes.values()].filter((group) => group.length > 1);
const repeatedVisualGroups = [...visualHashes.values()].filter((group) => group.length > 1);
const likelyHeroDuplicateGroups = [];

for (const eventName of eventNames) {
  const eventRecords = records.filter((record) =>
    record.filename.toLowerCase().startsWith(eventName.toLowerCase()),
  );
  const unassigned = new Set(eventRecords);
  while (unassigned.size > 0) {
    const seed = unassigned.values().next().value;
    unassigned.delete(seed);
    const group = [seed];
    for (const candidate of [...unassigned]) {
      let absoluteDifference = 0;
      for (let index = 0; index < seed.heroVector.length; index += 1) {
        absoluteDifference += Math.abs(seed.heroVector[index] - candidate.heroVector[index]);
      }
      const meanAbsoluteDifference = absoluteDifference / seed.heroVector.length;
      if (meanAbsoluteDifference <= 12) {
        group.push(candidate);
        unassigned.delete(candidate);
      }
    }
    if (group.length > 1) {
      likelyHeroDuplicateGroups.push({
        event: eventName,
        files: group.map((record) => record.filename),
      });
    }
  }
}
const report = {
  sourceImageCount: records.length,
  eventCount: eventNames.length,
  exactDuplicateGroups: repeatedExactGroups,
  visuallyIdenticalGroups: repeatedVisualGroups,
  likelyHeroDuplicateGroups,
  exactDuplicatesRemovedPotential: repeatedExactGroups.reduce(
    (total, group) => total + group.length - 1,
    0,
  ),
  visuallyIdenticalRemovedPotential: repeatedVisualGroups.reduce(
    (total, group) => total + group.length - 1,
    0,
  ),
  likelyHeroDuplicatesRemovedPotential: likelyHeroDuplicateGroups.reduce(
    (total, group) => total + group.files.length - 1,
    0,
  ),
  contactSheetPath,
};

await fs.writeFile(
  path.join(outputDir, "festival-source-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(JSON.stringify(report, null, 2));
