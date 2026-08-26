import assert from "node:assert/strict";
import test from "node:test";
import {
  legacyWordPressRedirects,
  resolveLegacyWordPressUrl
} from "../../lib/seo/legacy-wordpress";

test("redirects useful WordPress URLs to real equivalents", () => {
  assert.deepEqual(resolveLegacyWordPressUrl("/about/"), {
    type: "redirect",
    destination: "/about-us"
  });
  assert.deepEqual(resolveLegacyWordPressUrl("/proofreading/"), {
    type: "redirect",
    destination: "/editing-proofreading"
  });
  assert.deepEqual(resolveLegacyWordPressUrl("/start-a-project/"), {
    type: "redirect",
    destination: "/pricing#quote"
  });
});

test("uses distinct redirect sources and never redirects to itself", () => {
  const entries = Object.entries(legacyWordPressRedirects);
  assert.equal(new Set(entries.map(([source]) => source)).size, entries.length);
  for (const [source, destination] of entries) {
    assert.notEqual(source, destination);
  }
});

test("returns gone for compromised and WordPress system URLs", () => {
  const gonePaths = [
    "/100583hbojucpjpt.htm",
    "/103159hbojjp/ucrjrt.html",
    "/wp-json/wp/v2/pages/12269",
    "/wp-content/uploads/2022/09/old-image.png",
    "/category/university/",
    "/2020/08/28/how-universities-can-nurture-for-the-climate-crisis/",
    "/wp-sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/feed/",
    "/career/"
  ];

  for (const path of gonePaths) {
    assert.deepEqual(resolveLegacyWordPressUrl(path), { type: "gone" });
  }
});

test("returns gone for WordPress query endpoints", () => {
  assert.deepEqual(
    resolveLegacyWordPressUrl(
      "/",
      new URLSearchParams("elementskit_template=home-page-menu")
    ),
    { type: "gone" }
  );
  assert.deepEqual(
    resolveLegacyWordPressUrl("/", new URLSearchParams("s=old+search")),
    { type: "gone" }
  );
});

test("leaves current and unknown routes to Next.js", () => {
  assert.equal(resolveLegacyWordPressUrl("/about-us"), null);
  assert.equal(resolveLegacyWordPressUrl("/sitemap.xml"), null);
  assert.equal(resolveLegacyWordPressUrl("/future-resource"), null);
});
