import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMyWritexDemoModeEnabled } from "@/lib/my-writex/demo-mode";
import { createMyWritexDemoRequestDatabase } from "@/lib/my-writex/demo-request-seed";

if (!isMyWritexDemoModeEnabled()) {
  throw new Error("Refusing reset because the isolated My WriteX demo mode is not safely enabled.");
}

const target = process.env.MY_WRITEX_REQUEST_STORE_PATH?.trim();
if (!target || !path.isAbsolute(target)) {
  throw new Error("Refusing reset because MY_WRITEX_REQUEST_STORE_PATH is not an absolute path.");
}

const database = createMyWritexDemoRequestDatabase();
const serialized = `${JSON.stringify(database, null, 2)}\n`;
if (Buffer.byteLength(serialized, "utf8") > 1024 * 1024) {
  throw new Error("Refusing reset because the seeded demo store exceeds its one MiB safety cap.");
}

await mkdir(path.dirname(target), { recursive: true });
const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
await writeFile(temporary, serialized, { encoding: "utf8", flag: "wx" });
await rename(temporary, target);
console.log(`My WriteX demo request state restored (${database.requests.length} seeded requests).`);
