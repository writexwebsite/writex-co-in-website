import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const outputRoot = path.join(
  projectRoot,
  "docs",
  "holiday-experience-qa"
);

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

async function tile({ file, label, dark = false, mobile = false }) {
  const width = mobile ? 240 : 320;
  const height = mobile ? 300 : 260;
  const artwork = await sharp(file)
    .resize({
      width: mobile ? 120 : 180,
      height: mobile ? 120 : 180,
      fit: "contain"
    })
    .png()
    .toBuffer();
  const background = dark ? "#090f2f" : "#ffffff";
  const text = dark ? "#f5f4ff" : "#111b51";
  const border = dark ? "#4f4b88" : "#dcdaf4";
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background
    }
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}">
            <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="8" fill="none" stroke="${border}" stroke-width="2"/>
            <text x="16" y="${height - 26}" fill="${text}" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(label)}</text>
            <text x="16" y="${height - 9}" fill="${text}" opacity=".65" font-family="Arial, sans-serif" font-size="11">${dark ? "Dark" : "Light"} ${mobile ? "mobile" : "desktop"} preview</text>
          </svg>`
        )
      },
      {
        input: artwork,
        left: Math.round((width - (mobile ? 120 : 180)) / 2),
        top: 18
      }
    ])
    .png()
    .toBuffer();
}

async function contactSheet({ assets, fileName, mobile = false }) {
  const columns = mobile ? 4 : 4;
  const tileWidth = mobile ? 240 : 320;
  const tileHeight = mobile ? 300 : 260;
  const rendered = [];
  for (const asset of assets) {
    rendered.push(
      await tile({
        file: path.join(projectRoot, "public", asset.path),
        label: asset.label,
        dark: asset.dark,
        mobile
      })
    );
  }
  const rows = Math.ceil(rendered.length / columns);
  const canvas = sharp({
    create: {
      width: columns * tileWidth,
      height: rows * tileHeight,
      channels: 4,
      background: "#ececf8"
    }
  });
  await canvas
    .composite(
      rendered.map((input, index) => ({
        input,
        left: (index % columns) * tileWidth,
        top: Math.floor(index / columns) * tileHeight
      }))
    )
    .png()
    .toFile(path.join(outputRoot, fileName));
}

await mkdir(outputRoot, { recursive: true });

const criticalAssets = [
  ["flowers_botanicals/marigold-yellow.svg", "Yellow marigold"],
  ["flowers_botanicals/marigold-orange.svg", "Orange marigold"],
  ["flowers_botanicals/lotus-pink.svg", "Pink lotus"],
  ["flowers_botanicals/rose-red.svg", "Red rose"],
  ["flowers_botanicals/jasmine-cluster.svg", "Jasmine cluster"],
  ["flowers_botanicals/hibiscus-red.svg", "Red hibiscus"],
  ["flowers_botanicals/tuberose-stem.svg", "Tuberose"],
  ["flowers_botanicals/chrysanthemum-gold.svg", "Chrysanthemum"],
  ["flowers_botanicals/palash-branch.svg", "Palash"],
  ["flowers_botanicals/holly-sprig.svg", "Holly"],
  ["flowers_botanicals/mistletoe-sprig.svg", "Mistletoe"],
  ["light_fire/diya-brass.svg", "Brass diya"],
  ["ceremonial_objects/temple-bell.svg", "Temple bell"],
  ["ceremonial_objects/conch-shell.svg", "Conch shell"],
  ["ceremonial_objects/dhaak-drum.svg", "Dhaak"],
  ["ceremonial_objects/dhunuchi.svg", "Dhunuchi"],
  ["patterns/alpana-bengal.svg", "Bengali alpana"],
  ["patterns/rangoli-diya.svg", "Diwali rangoli"],
  ["holi/holi-gulal-cloud.svg", "Gulal cloud"],
  ["holi/holi-pichkari.svg", "Pichkari"],
  ["christmas/christmas-tree.svg", "Christmas tree"],
  ["christmas/christmas-snowman.svg", "Snowman"],
  ["christmas/christmas-reindeer.svg", "Reindeer"],
  ["christmas/christmas-santa-sleigh.svg", "Santa sleigh"]
].flatMap(([assetPath, label]) => [
  {
    path: `festival-assets/library/${assetPath}`,
    label,
    dark: false
  },
  {
    path: `festival-assets/library/${assetPath}`,
    label,
    dark: true
  }
]);

await contactSheet({
  assets: criticalAssets,
  fileName: "festival-asset-contact-sheet.png"
});
await contactSheet({
  assets: criticalAssets.slice(0, 32),
  fileName: "festival-asset-mobile-contact-sheet.png",
  mobile: true
});

const packs = ["durga-puja", "holi", "diwali", "christmas"];
const packAssets = packs.flatMap((pack) => [
  {
    path: `festival-assets/${pack}/header/scene.svg`,
    label: `${pack} header`,
    dark: false
  },
  {
    path: `festival-assets/${pack}/hero/corner-accent.svg`,
    label: `${pack} hero`,
    dark: true
  },
  {
    path: `festival-assets/${pack}/axo/outfit-overlay.svg`,
    label: `${pack} Axo`,
    dark: false
  },
  {
    path: `festival-assets/${pack}/overlays/login-corners.svg`,
    label: `${pack} login`,
    dark: true
  }
]);
await contactSheet({
  assets: packAssets,
  fileName: "festival-pack-contact-sheet.png"
});

const generated = [
  "festival-asset-contact-sheet.png",
  "festival-asset-mobile-contact-sheet.png",
  "festival-pack-contact-sheet.png"
];
await writeFile(
  path.join(outputRoot, "visual-qa-index.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), files: generated }, null, 2)}\n`
);

for (const file of generated) {
  await readFile(path.join(outputRoot, file));
}

console.log(`Generated ${generated.length} festival QA contact sheets.`);
