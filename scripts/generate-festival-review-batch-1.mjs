import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("private-assets/festival-review-batch-1");
const previewRoot = path.resolve("docs/holiday-experience-qa/batch-1-review");
const festivals = {
  "independence-day": { name: "Independence Day", colours: ["#f48b2a", "#f7f5ec", "#218a52", "#234f9c"] },
  diwali: { name: "Diwali", colours: ["#e36b1f", "#f5bb32", "#a52d45", "#237251"] },
  holi: { name: "Holi", colours: ["#7c3aed", "#ec3d85", "#18aebe", "#f2b72f"] },
  "durga-puja": { name: "Durga Puja", colours: ["#b4213a", "#f0a72e", "#f8f1e7", "#6f2f37"] },
  eid: { name: "Eid", colours: ["#13745a", "#d7b654", "#eaf4ea", "#315b89"] },
  christmas: { name: "Christmas", colours: ["#176b45", "#c83249", "#e5b94b", "#d8edf4"] },
  shared: { name: "Shared Reusable", colours: ["#6b35d4", "#d8a84b", "#1b8f86", "#e95c84"] }
};

const groups = {
  "independence-day": {
    header: ["Subtle Tricolour Light Rail", "Patriotic Floral Rail", "Kite Flight Header Rail", "Chakra Light Accent Rail"],
    ground: ["Tricolour Floral Ground Clusters", "Kite and Ribbon Edge", "National Celebration Ground Lights"],
    axo: ["Respectful Handheld Flag Prop", "Patriotic Badge", "Tricolour Wrist Light", "Kite Hand Prop", "Salute Spark Accent"],
    ambient: ["Tricolour Light Particles", "Floating Kite Silhouettes", "National Celebration Sparkles"],
    feature: ["Tricolour Light Wave", "Controlled Kite Flight", "Dignified Flag Light Sweep"]
  },
  diwali: {
    header: ["Layered Marigold Toran", "Mango Leaf Toran", "Diya Light Rail", "Hanging Kandil Collection", "Bell and Flower Rail"],
    ground: ["Eight Petal Rangoli", "Geometric Rangoli", "Ceremonial Diya Row", "Flower Petal Corner", "Kandil Ground Cluster"],
    axo: ["Handheld Diya Prop", "Kandil Hand Prop", "Flower Basket Prop", "Festive Scarf Accent", "Sweets Gift Prop"],
    ambient: ["Warm Festival Sparkles", "Floating Diya Glow", "Marigold Petal Fall", "Firefly Light Drift"],
    feature: ["Controlled Gold Fireworks", "Sparkler Trail", "Sequential Diya Lighting"]
  },
  holi: {
    header: ["Layered Colour Ribbon Rail", "Gulal Edge Accent", "Playful Colour Drop Rail", "Pichkari Silhouette Rail"],
    ground: ["Three Gulal Piles", "Festival Colour Bowls", "Crossed Pichkari Props", "Colour Splash Corners"],
    axo: ["Axo Pichkari Prop", "Axo Gulal Plate", "Colour Safe Scarf", "Water Balloon Hand Prop"],
    ambient: ["Holi Colour Particles", "Light Gulal Mist", "Floating Colour Droplets"],
    feature: ["Controlled Colour Burst", "Pichkari Spray Arc", "Edge to Edge Colour Trail"]
  },
  "durga-puja": {
    header: ["Bengali Floral Rail", "Marigold Hibiscus Rail", "Shola Inspired Pattern", "Bell Paper Craft Rail", "Kash Flower Header Accent"],
    ground: ["Circular Alpana", "Lotus Alpana Border", "Hibiscus Arrangement", "Dhunuchi Light Silhouettes"],
    axo: ["Bengali Festive Scarf", "Hibiscus Flower Prop", "Dhaak Hand Prop", "Conch Hand Prop", "Ceremonial Diya Prop"],
    ambient: ["Hibiscus Petal Fall", "Warm Puja Particles", "Subtle Incense Mist"],
    feature: ["Controlled Flower Shower", "Dhaak Rhythm Pulse", "Dhunuchi Light Sequence"]
  },
  eid: {
    header: ["Lantern Light Rail", "Crescent Star Rail", "Islamic Geometric Rail", "Elegant Hanging Lights"],
    ground: ["Lantern Ground Cluster", "Geometric Edge Pattern", "Moonlit Star Arrangement"],
    axo: ["Elegant Festive Scarf", "Eid Lantern Prop", "Eid Gift Prop", "Crescent Star Light Accessory"],
    ambient: ["Star Twinkle Field", "Lantern Glow Drift", "Soft Moonlight Particles"],
    feature: ["Floating Lantern Journey", "Crescent Star Light Sweep"]
  },
  christmas: {
    header: ["Pine Cone Header Rail", "Warm Fairy Light Rail", "Christmas Bell Rail"],
    ground: ["Gift Ground Arrangement", "Snow Ground Edge", "Pine Cone Ground Cluster"],
    axo: ["Winter Scarf Accessory", "Christmas Bell Prop", "Christmas Star Prop"],
    ambient: ["Richer Snowfall", "Warm Window Sparkles"],
    feature: ["Reindeer Gift Journey"]
  },
  shared: {
    header: ["Neutral Warm Fairy Lights", "Neutral Flower Corner Rail", "Generic Paper Craft Rail"],
    ground: ["Page Bottom Floral Divider", "Section Edge Light Divider"],
    axo: ["Reusable Gift Prop", "Reusable Flower Prop"],
    ambient: ["Neutral Celebration Sparkles", "Gold Star Particles", "Soft Flower Petals", "Neutral Lantern Glow"],
    feature: ["Neutral Gift Ribbon Sweep", "Reusable Bell Swing", "Soft Festive Confetti"]
  }
};

const categoryConfig = {
  header: { label: "Header decoration", region: ["navigation_rail"], viewBox: "0 0 1440 220", width: 1440, height: 220 },
  ground: { label: "Ground and page-bottom", region: ["footer_decoration", "section_dividers"], viewBox: "0 0 1440 280", width: 1440, height: 280 },
  axo: { label: "AXO accessory or prop", region: ["axo_area"], viewBox: "0 0 420 420", width: 420, height: 420 },
  ambient: { label: "Ambient effect", region: ["page_ambience", "floating_edges"], viewBox: "0 0 960 540", width: 960, height: 540 },
  feature: { label: "Feature effect", region: ["hero_foreground", "page_ambience"], viewBox: "0 0 960 540", width: 960, height: 540 }
};

const escapeXml = (value) => value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]);
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hash = (value) => createHash("sha256").update(value).digest("hex");

function petals(cx, cy, radius, colour, count = 10) {
  return `<g>${Array.from({ length: count }, (_, index) => `<ellipse cx="${cx}" cy="${cy - radius}" rx="${Math.round(radius * .36)}" ry="${Math.round(radius * .82)}" fill="${colour}" transform="rotate(${index * (360 / count)} ${cx} ${cy})"/>`).join("")}<circle cx="${cx}" cy="${cy}" r="${Math.round(radius * .3)}" fill="#f3b632"/></g>`;
}
function star(cx, cy, radius, colour) {
  const points = Array.from({ length: 10 }, (_, index) => { const angle = -Math.PI / 2 + index * Math.PI / 5; const r = index % 2 ? radius * .42 : radius; return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`; }).join(" ");
  return `<polygon points="${points}" fill="${colour}"/>`;
}
function lantern(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M28 0h64l16 23-13 112H25L12 23Z" fill="${colours[0]}" stroke="${colours[1]}" stroke-width="6"/><path d="M28 0 60 27 92 0M12 23h96M60 27v108" fill="none" stroke="${colours[1]}" stroke-width="5"/><circle cx="60" cy="78" r="22" fill="#ffe89c" opacity=".85"/></g>`;
}
function diya(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 54q58 42 116 0-12 60-58 64Q12 114 0 54Z" fill="${colours[0]}" stroke="${colours[2]}" stroke-width="6"/><path d="M58 53Q26 17 64-24q43 44-6 77Z" fill="#ff9a1f"/><path d="M60 38Q45 18 63 0q18 20-3 38Z" fill="#fff0a0"/></g>`;
}
function bell(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M20 80Q24 12 70 4q46 8 50 76l18 22H2Z" fill="${colours[1]}" stroke="#936219" stroke-width="6"/><circle cx="70" cy="109" r="13" fill="#b9781d"/><path d="M53 4q17-20 34 0" fill="none" stroke="#936219" stroke-width="7"/></g>`;
}
function kite(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M70 0 0 82l70 70 70-70Z" fill="${colours[1]}" stroke="${colours[3]}" stroke-width="5"/><path d="M70 0 0 82h140Z" fill="${colours[0]}"/><path d="M0 82h140l-70 70Z" fill="${colours[2]}"/><path d="M70 152q38 27 4 55-34-23-4-55Z" fill="${colours[3]}"/></g>`;
}
function crescent(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M92 5Q19 34 25 112q6 76 88 93-59-38-48-104Q75 42 132 20 112 5 92 5Z" fill="${colours[1]}"/>${star(153, 58, 25, colours[1])}</g>`;
}
function gift(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><rect x="5" y="42" width="120" height="94" rx="8" fill="${colours[0]}" stroke="${colours[2]}" stroke-width="6"/><path d="M65 42v94M5 76h120" stroke="${colours[1]}" stroke-width="10"/><path d="M65 42Q20 8 12 38q17 28 53 13ZM65 42q45-34 53-4-17 28-53 13Z" fill="${colours[1]}"/></g>`;
}
function pichkari(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) rotate(-28) scale(${scale})"><rect width="150" height="52" rx="20" fill="${colours[0]}" stroke="${colours[3]}" stroke-width="6"/><path d="M25 0v52M55 0v52M85 0v52M115 0v52" stroke="${colours[1]}" stroke-width="7"/><path d="M150 12h36v28h-36ZM0 13h-28v26H0" fill="${colours[2]}"/></g>`;
}
function conch(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M8 110Q35 22 128 12q60-5 77 43-31 13-58 35 26 50-9 89-42 42-93 10Q-4 159 8 110Z" fill="#fff7e6" stroke="#b98545" stroke-width="7"/><path d="M126 13q-45 42-27 89 15 42 61 58" fill="none" stroke="#d9bb8a" stroke-width="8"/></g>`;
}
function flag(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M20 8v210" stroke="#70482d" stroke-width="9" stroke-linecap="round"/><path d="M25 14h138v90H25Z" fill="#f7f5ec" stroke="#234f9c" stroke-width="4"/><path d="M25 14h138v30H25Z" fill="#f48b2a"/><path d="M25 74h138v30H25Z" fill="#218a52"/><circle cx="94" cy="59" r="13" fill="none" stroke="#234f9c" stroke-width="3"/>${Array.from({length:12},(_,i)=>`<path d="M94 46v26" stroke="#234f9c" stroke-width="1.5" transform="rotate(${i*15} 94 59)"/>`).join("")}</g>`;
}
function bowl(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="72" cy="34" rx="64" ry="27" fill="${colours[1]}"/><path d="M8 34q12 96 64 100 52-4 64-100-64 37-128 0Z" fill="${colours[0]}" stroke="${colours[3]}" stroke-width="6"/><circle cx="45" cy="21" r="13" fill="${colours[2]}"/><circle cx="80" cy="15" r="18" fill="${colours[1]}"/><circle cx="108" cy="26" r="12" fill="${colours[0]}"/></g>`;
}
function drum(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M18 28Q75 4 132 28l-12 132q-45 25-90 0Z" fill="${colours[0]}" stroke="${colours[3]}" stroke-width="7"/><path d="M28 37l92 114M122 37 30 151" stroke="${colours[1]}" stroke-width="7"/><ellipse cx="75" cy="28" rx="57" ry="19" fill="${colours[2]}" stroke="${colours[3]}" stroke-width="6"/></g>`;
}
function leaf(x, y, scale, colours) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M10 80Q42 5 130 10q-7 88-92 116Q12 113 10 80Z" fill="${colours[2]}" stroke="${colours[3]}" stroke-width="5"/><path d="M27 105Q68 64 113 26" fill="none" stroke="${colours[3]}" stroke-width="5"/></g>`;
}

function motifFor(name) {
  const value = name.toLowerCase();
  if (/flag/.test(value)) return "flag";
  if (/dhaak|rhythm/.test(value)) return "drum";
  if (/gulal plate|gulal pile|colour bowl|water balloon/.test(value)) return /balloon/.test(value) ? "balloon" : "bowl";
  if (/mango leaf|pine|kash flower/.test(value)) return "leaf";
  if (/badge|chakra|alpana|rangoli|geometric|shola/.test(value)) return "pattern";
  if (/wrist light|spark accent|star prop|star light|star arrangement/.test(value)) return "star";
  if (/lantern|kandil/.test(value)) return "lantern";
  if (/diya|dhunuchi/.test(value)) return "diya";
  if (/bell|dhaak/.test(value)) return "bell";
  if (/kite/.test(value)) return "kite";
  if (/crescent|moon/.test(value)) return "crescent";
  if (/gift|sweets/.test(value)) return "gift";
  if (/pichkari|spray/.test(value)) return "pichkari";
  if (/conch/.test(value)) return "conch";
  if (/snow/.test(value)) return "snow";
  if (/pine/.test(value)) return "pine";
  if (/gulal|colour|mist|particles|sparkle|firefly|twinkle|confetti|firework|wave|sweep|trail|pulse|shower|petal|glow|light/.test(value)) return "particles";
  if (/scarf|badge|wrist/.test(value)) return "accessory";
  return "floral";
}

function renderAsset(asset, colours) {
  const config = categoryConfig[asset.category];
  const motif = motifFor(asset.name);
  const seed = Number.parseInt(hash(asset.id).slice(0, 8), 16);
  let body = "";
  if (asset.category === "header") {
    body += `<path d="M0 ${55 + seed % 35} Q360 ${150 - seed % 40} 720 ${55 + seed % 25} T1440 ${55 + seed % 35}" fill="none" stroke="${colours[1]}" stroke-width="5" opacity=".55"/>`;
    for (let i = 0; i < 9; i += 1) {
      const x = 70 + i * 162;
      body += motif === "lantern" ? lantern(x, 28 + (i % 2) * 18, .55, colours) : motif === "diya" ? diya(x, 75, .48, colours) : motif === "bell" ? bell(x, 35, .55, colours) : motif === "kite" ? kite(x, 24 + (i % 3) * 10, .55, colours) : motif === "crescent" ? crescent(x, 28, .5, colours) : motif === "leaf" ? leaf(x, 52, .55, colours) : motif === "pichkari" ? pichkari(x, 95, .42, colours) : ["pattern","star","particles"].includes(motif) ? star(x + 50, 95, 38 + (i % 2) * 8, colours[i % colours.length]) : petals(x + 50, 105, 38 + (i % 3) * 3, colours[i % colours.length], 8 + (i % 3) * 2);
    }
  } else if (asset.category === "ground") {
    body += `<path d="M0 250Q360 ${170 + seed % 45} 720 245T1440 250V280H0Z" fill="${colours[2]}" opacity=".2"/>`;
    for (let i = 0; i < 7; i += 1) {
      const x = 30 + i * 215;
      body += motif === "diya" ? diya(x, 130 - (i % 2) * 20, .7, colours) : motif === "lantern" ? lantern(x, 75, .72, colours) : motif === "kite" ? kite(x, 95, .58, colours) : motif === "gift" ? gift(x, 105, .68 + (i % 2) * .1, colours) : motif === "pichkari" ? pichkari(x, 170, .55, colours) : motif === "bowl" ? bowl(x, 115, .65, colours) : motif === "leaf" ? leaf(x, 120, .7, colours) : motif === "pattern" ? `<g transform="translate(${x + 95} 180)">${Array.from({ length: 10 }, (_, p) => `<ellipse cx="0" cy="-65" rx="22" ry="58" fill="${colours[p % colours.length]}" transform="rotate(${p * 36})"/>`).join("")}</g>` : petals(x + 90, 195, 50 + (i % 2) * 8, colours[i % colours.length], 10);
    }
  } else if (asset.category === "axo") {
    const anchor = asset.axoAnchor;
    body += `<path d="M30 30h360v360H30Z" fill="none" stroke="${colours[3]}" stroke-dasharray="8 14" opacity=".16"/>`;
    const transform = anchor === "head" ? [100, 22, 1.2] : anchor.includes("hand") ? [125, 120, 1.08] : anchor === "ground" ? [100, 220, 1.15] : [95, 90, 1.15];
    body += motif === "lantern" ? lantern(...transform, colours) : motif === "diya" ? diya(...transform, colours) : motif === "bell" ? bell(...transform, colours) : motif === "drum" ? drum(...transform, colours) : motif === "kite" ? kite(...transform, colours) : motif === "flag" ? flag(...transform, colours) : motif === "gift" ? gift(...transform, colours) : motif === "pichkari" ? pichkari(...transform, colours) : motif === "conch" ? conch(...transform, colours) : motif === "bowl" ? bowl(...transform, colours) : motif === "balloon" ? `<g>${[[-55,15],[5,-20],[55,20]].map(([dx,dy],i)=>`<circle cx="${210+dx}" cy="${190+dy}" r="${48-i*5}" fill="${colours[i]}"/><path d="M${210+dx} ${238+dy}q${i%2?30:-30} 45 0 85" fill="none" stroke="${colours[3]}" stroke-width="4"/>`).join("")}</g>` : motif === "star" ? star(210, 200, 105, colours[1]) : motif === "pattern" ? `<g transform="translate(210 205)">${Array.from({length:16},(_,i)=>`<circle cx="0" cy="-95" r="9" fill="${colours[i%4]}" transform="rotate(${i*22.5})"/>`).join("")}<circle r="55" fill="none" stroke="${colours[3]}" stroke-width="8"/></g>` : motif === "particles" ? `<g>${Array.from({length:16},(_,i)=>`<circle cx="${80+(i*71)%290}" cy="${70+(i*47)%270}" r="${7+(i%4)*4}" fill="${colours[i%4]}"/>`).join("")}</g>` : motif === "accessory" ? `<path d="M75 120Q210 205 345 120l-42 105q-93 53-186 0Z" fill="${colours[0]}" stroke="${colours[3]}" stroke-width="7"/><path d="M110 155q100 42 200 0" fill="none" stroke="${colours[1]}" stroke-width="13"/>` : petals(210, 210, 94, colours[0], 12);
  } else {
    const particleCount = asset.category === "feature" ? 26 : 18;
    if (motif === "lantern") for (let i = 0; i < 6; i += 1) body += lantern(55 + i * 155, 75 + (i % 3) * 80, .55 + (i % 2) * .12, colours);
    else if (motif === "kite") for (let i = 0; i < 7; i += 1) body += kite(35 + i * 135, 45 + (i % 3) * 100, .48 + (i % 2) * .08, colours);
    else if (motif === "pichkari") body += pichkari(250, 300, 1.35, colours) + `<path d="M150 330Q450 30 900 180" fill="none" stroke="${colours[1]}" stroke-width="35" stroke-linecap="round" opacity=".68"/>`;
    else if (motif === "crescent") body += crescent(350, 120, 1.2, colours);
    else if (motif === "diya") for (let i = 0; i < 7; i += 1) body += diya(35 + i * 135, 300 - (i % 2) * 55, .55, colours);
    else {
      for (let i = 0; i < particleCount; i += 1) {
        const x = 35 + ((seed * (i + 11) + i * 97) % 890);
        const y = 35 + ((seed * (i + 7) + i * 61) % 470);
        const radius = 7 + ((seed + i * 13) % 22);
        body += motif === "snow" ? star(x, y, radius, colours[3]) : motif === "floral" ? petals(x, y, radius, colours[i % colours.length], 7) : `<circle cx="${x}" cy="${y}" r="${radius}" fill="${colours[i % colours.length]}" opacity="${.35 + (i % 5) * .12}"/>`;
      }
      if (asset.category === "feature") body += `<path d="M-20 ${420 - seed % 100}Q240 ${80 + seed % 90} 480 ${300 - seed % 70}T980 ${90 + seed % 150}" fill="none" stroke="${colours[0]}" stroke-width="20" opacity=".55" stroke-linecap="round"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${config.viewBox}" role="img" aria-labelledby="title"><title id="title">${escapeXml(asset.name)}</title><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#201341" flood-opacity=".22"/></filter></defs><g filter="url(#shadow)">${body}</g></svg>`;
}

function buildCatalog() {
  const catalog = [];
  for (const [festivalSlug, categories] of Object.entries(groups)) {
    for (const [category, names] of Object.entries(categories)) {
      names.forEach((name, index) => {
        const id = `wx-fr-b1-${festivalSlug}-${category}-${String(index + 1).padStart(2, "0")}`;
        const axoAnchors = ["head", "left_hand", "right_hand", "chest_safe_area", "side", "ground", "background_behind_axo"];
        catalog.push({
          id,
          name,
          festivalSlug,
          festivalName: festivals[festivalSlug].name,
          category,
          subcategory: motifFor(name),
          compatibleFestivals: festivalSlug === "shared" ? ["shared"] : [festivalSlug],
          supportedRegions: categoryConfig[category].region,
          axoAnchor: category === "axo" ? axoAnchors[index % axoAnchors.length] : null,
          readiness: { desktop: true, tablet: true, mobile: category !== "feature" || index % 3 !== 2, light: true, dark: true },
          reducedMotionFallback: category === "ambient" || category === "feature" ? "static_approved_frame" : "not_applicable",
          transparentBackground: true,
          fileType: "image/svg+xml",
          dimensions: { width: categoryConfig[category].width, height: categoryConfig[category].height },
          provenance: "WriteX source-controlled vector composition; no third-party artwork",
          version: 1,
          reviewState: "visual_review_required",
          publicEligible: false,
          creationMethod: category === "ambient" || category === "feature" ? "source_controlled_svg_and_declarative_motion" : "source_controlled_svg",
          performanceCost: category === "feature" ? "medium" : "low",
          restrictions: [
            "Founder approval required before governed-library promotion",
            ...(festivalSlug === "independence-day" ? ["Indian flag must remain upright, undistorted and never touch the floor"] : []),
            ...(festivalSlug === "durga-puja" ? ["Non-deity decoration only"] : []),
            ...(festivalSlug === "eid" ? ["No religious figures"] : []),
            ...(category === "axo" ? ["Do not cover AXO face, chest branding, belt branding or core proportions"] : []),
            ...(category === "ambient" || category === "feature" ? ["Must not intercept interaction or cover functional controls"] : [])
          ],
          motion: category === "ambient" || category === "feature" ? { preset: motifFor(name), durationMs: 5000 + (index % 4) * 1200, intensity: category === "feature" ? "balanced" : "subtle", loop: true, mobileReduced: true } : null
        });
      });
    }
  }
  return catalog;
}

await rm(root, { recursive: true, force: true });
await rm(previewRoot, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await mkdir(previewRoot, { recursive: true });
const catalog = buildCatalog();
if (catalog.length !== 120) throw new Error(`Expected 120 assets, received ${catalog.length}.`);

for (const asset of catalog) {
  const svg = renderAsset(asset, festivals[asset.festivalSlug].colours);
  const directory = path.join(root, asset.festivalSlug, asset.category);
  await mkdir(directory, { recursive: true });
  const fileName = `${slugify(asset.name)}.svg`;
  await writeFile(path.join(directory, fileName), svg);
  asset.fileName = fileName;
  asset.relativePath = `${asset.festivalSlug}/${asset.category}/${fileName}`;
  asset.checksumSha256 = hash(svg);
}

const byFestival = Object.fromEntries(Object.keys(festivals).map((slug) => [slug, catalog.filter((item) => item.festivalSlug === slug).length]));
const byCategory = Object.fromEntries(Object.keys(categoryConfig).map((category) => [category, catalog.filter((item) => item.category === category).length]));
const summary = { batchId: "festival-review-batch-1", state: "visual_review_required", total: catalog.length, byFestival, byCategory, sourceRequired: 0, approved: 0, createdAt: "2026-08-01T00:00:00.000Z" };
await writeFile(path.join(root, "manifest.json"), `${JSON.stringify({ ...summary, assets: catalog }, null, 2)}\n`);
await writeFile(path.join(previewRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

async function contactSheet(name, assets) {
  const cellWidth = 300;
  const cellHeight = 230;
  const columns = 4;
  const rows = Math.ceil(assets.length / columns);
  const composites = [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const input = path.join(root, asset.relativePath);
    const thumb = await sharp(input, { density: 110 }).resize({ width: 270, height: 165, fit: "contain", background: { r: 248, g: 247, b: 252, alpha: 1 } }).png().toBuffer();
    composites.push({ input: thumb, left: (index % columns) * cellWidth + 15, top: Math.floor(index / columns) * cellHeight + 10 });
    const label = `<svg width="270" height="50"><rect width="270" height="50" fill="#fff"/><text x="4" y="16" font-family="Arial" font-size="12" font-weight="700" fill="#171b4b">${escapeXml(asset.name.slice(0, 38))}</text><text x="4" y="33" font-family="Arial" font-size="10" fill="#555b7d">${escapeXml(asset.id)}</text><text x="4" y="46" font-family="Arial" font-size="9" fill="#a24b16">Visual Review Required</text></svg>`;
    composites.push({ input: Buffer.from(label), left: (index % columns) * cellWidth + 15, top: Math.floor(index / columns) * cellHeight + 175 });
  }
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: "#f2f0f8" } }).composite(composites).png().toFile(path.join(previewRoot, `${name}.png`));
}

for (const slug of Object.keys(festivals)) await contactSheet(`festival-${slug}`, catalog.filter((item) => item.festivalSlug === slug));
for (const category of Object.keys(categoryConfig)) await contactSheet(`category-${category}`, catalog.filter((item) => item.category === category));

const motionAssets = catalog.filter((asset) => asset.motion);
await writeFile(path.join(previewRoot, "motion-preview.html"), `<!doctype html><meta charset="utf-8"><title>Batch 1 motion review</title><style>body{font-family:Arial;background:#11152f;color:#fff;margin:0;padding:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.card{background:#fff;color:#171b4b;border-radius:8px;padding:14px}.stage{height:180px;background:linear-gradient(135deg,#f9f7ff,#e8efff);overflow:hidden;position:relative}.stage img{width:100%;height:100%;object-fit:contain;animation:float 6s ease-in-out infinite}.card:nth-child(3n) img{animation-name:pulse}.card:nth-child(3n+1) img{animation-name:drift}@keyframes float{50%{transform:translateY(-10px)}}@keyframes pulse{50%{transform:scale(1.04);opacity:.78}}@keyframes drift{50%{transform:translateX(12px)}}@media(prefers-reduced-motion:reduce){.stage img{animation:none}}</style><h1>Festival Asset Library - Batch 1 Motion Review</h1><p>Private review artifact. Every item remains Visual Review Required.</p><div class="grid">${motionAssets.map((asset) => `<article class="card"><div class="stage"><img src="../../../../private-assets/festival-review-batch-1/${asset.relativePath}" alt=""></div><h2>${escapeXml(asset.name)}</h2><p>${asset.festivalName} / ${categoryConfig[asset.category].label}</p><small>${asset.id} / Visual Review Required</small></article>`).join("")}</div>`);
console.log(JSON.stringify(summary, null, 2));
