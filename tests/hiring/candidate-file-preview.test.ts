import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function source(file: string) {
  return readFile(path.join(process.cwd(), file), "utf8");
}

test("candidate previews stay same-origin without weakening the site CSP", async () => {
  const [files, previewRoute, nextConfig] = await Promise.all([
    source("lib/hiring/files.ts"),
    source("app/api/admin/hiring/files/[fileId]/preview/route.ts"),
    source("next.config.mjs")
  ]);

  assert.match(files, /\/api\/admin\/hiring\/files\/\$\{encodeURIComponent\(file\.id\)\}\/preview/);
  assert.doesNotMatch(files, /getSignedPreviewUrl/);
  assert.doesNotMatch(files, /preview_requested/);
  assert.match(previewRoute, /getAdminSessionFromRequest/);
  assert.match(previewRoute, /assertHiringPermission/);
  assert.match(previewRoute, /getCandidateFileInlinePreview/);
  assert.match(previewRoute, /private, no-store, max-age=0/);
  assert.match(previewRoute, /content-disposition/);
  assert.match(nextConfig, /default-src 'self'/);
  assert.doesNotMatch(nextConfig, /frame-src https:/);
});

test("candidate preview UI has loading, retry and full-screen recovery controls", async () => {
  const component = await source("components/admin/CandidateDocumentActions.tsx");

  assert.match(component, /Loading private CV preview/);
  assert.match(component, /Open full screen/);
  assert.match(component, /The embedded preview could not load/);
  assert.match(component, /available only while signed in/);
});
