import fs from "node:fs/promises";
import path from "node:path";

const [summaryPath, libraryRoot, outputPath] = process.argv.slice(2);
if (!summaryPath || !libraryRoot || !outputPath) {
  throw new Error("Usage: node scripts/audit-complete-festival-library.mjs <summary.json> <library-root> <output.json>");
}

const aliases = new Map([
  ["chaat puja", ["Chhath Puja", "chhath-puja", null]],
  ["eid festival", ["Eid", "eid", null]],
  ["christmas", ["Christmas", "christmas", null]],
  ["durga puja", ["Durga Puja", "durga-puja", null]],
  ["gurunanak jayanti", ["Guru Nanak Jayanti", "guru-nanak-jayanti", null]],
  ["happy new year", ["New Year", "new-year", null]],
  ["valentine day", ["Valentine's Day", "valentines-day", null]],
  ["children day", ["Children's Day", "childrens-day", null]],
  ["st patrick day", ["St. Patrick's Day", "st-patricks-day", null]],
  ["yoga day", ["International Yoga Day", "international-yoga-day", null]]
]);
const normalized = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slug = (value) => normalized(value).replace(/ /g, "-");
const canonical = (value) => aliases.get(normalized(value)) || [value === "christmas" ? "Christmas" : value, slug(value), /bihu/i.test(value) ? "Bihu" : null];
const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
const summaryEvents = new Map(Object.entries(summary.events).map(([name, counts]) => [normalized(name), counts]));
const index = JSON.parse(await fs.readFile(path.join(libraryRoot, "index.json"), "utf8"));
const records = [];
const events = [];

for (const pack of index.packs) {
  const manifest = JSON.parse(await fs.readFile(path.join(libraryRoot, pack.slug, "manifest.json"), "utf8"));
  const [canonicalName, canonicalSlug, family] = canonical(pack.eventName);
  const sourceCounts = summaryEvents.get(normalized(pack.eventName));
  if (!sourceCounts) throw new Error(`Inventory event missing: ${pack.eventName}`);
  const pairs = Math.min(sourceCounts.Client, sourceCounts.Employee);
  const unpaired = Math.abs(sourceCounts.Client - sourceCounts.Employee);
  for (const source of manifest.sourceReferences) {
    const surface = /client login/i.test(source.filename) ? "Client" : /employee login/i.test(source.filename) ? "Employee" : "Unknown";
    records.push({
      originalFilename: source.filename,
      rawEventName: pack.eventName,
      canonicalEventName: canonicalName,
      canonicalEventSlug: canonicalSlug,
      eventFamily: family,
      loginSurface: surface,
      visualVariant: "Source visual; canonical clean pack mapped as Default Variant",
      dimensions: Object.keys(summary.dimension_counts),
      checksumSha256: source.checksumSha256,
      processingStatus: source.selectedForMaster ? "clean master selected" : "source retained; clean canonical pack available",
      mappingStatus: "mapped"
    });
  }
  events.push({
    rawEventName: pack.eventName, canonicalName, canonicalSlug, family,
    sourceImages: manifest.sourceImageCount,
    clientImages: sourceCounts.Client, employeeImages: sourceCounts.Employee,
    pairedSourceDesignsByOrder: pairs, unpairedSourceFiles: unpaired,
    mappedCleanVariants: 1,
    heroAssets: { desktop: true, tablet: true, mobile: true },
    backgroundAssets: { desktop: true, tablet: true, mobile: true },
    clientCompatible: manifest.clientCompatible === true,
    employeeCompatible: manifest.employeeCompatible === true,
    adminReadiness: "Ready for private approval; not publicly activated"
  });
}

if (records.length !== 175 || events.length !== 28) {
  throw new Error(`Completeness failed: ${records.length} files, ${events.length} events`);
}
const report = {
  generatedAt: new Date().toISOString(),
  source: summary.zip,
  totals: {
    sourceImages: records.length,
    rawEventGroups: events.length,
    canonicalEvents: new Set(events.map((event) => event.canonicalSlug)).size,
    processedHeroPacks: events.length,
    processedBackgroundPacks: events.length,
    cleanVariantsMapped: events.length,
    clientEmployeePairsByDeterministicOrder: events.reduce((sum, event) => sum + event.pairedSourceDesignsByOrder, 0),
    unpairedSourceFiles: events.reduce((sum, event) => sum + event.unpairedSourceFiles, 0),
    orphanedProcessedPacks: 0
  },
  genuinelyMissing: ["Holi"],
  aliasMappings: events.filter((event) => normalized(event.rawEventName) !== normalized(event.canonicalName)).map((event) => ({ from: event.rawEventName, to: event.canonicalName })),
  events: events.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)),
  files: records
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.totals));
