import { createServer } from "node:http";

const port = Number(process.env.QA_FESTIVAL_PROXY_PORT || 4030);
const upstreamOrigin =
  process.env.QA_FESTIVAL_UPSTREAM_ORIGIN || "https://www.writex.co.in";
const upstreamHost = new URL(upstreamOrigin).host;

const baseMotifs = {
  garlands: false,
  bells: false,
  paperFans: false,
  leafVines: false,
  diyaGlow: false,
  warmParticles: true,
  lightStrings: false,
  lanterns: false,
  stars: false,
  snow: false,
  colourBursts: false,
  fireworks: false,
  confetti: false,
  alpana: false,
  ribbons: false,
  kites: false,
  moonLanterns: false,
  floralCorners: false,
  harvest: false,
  silhouettes: false,
  dholAccent: false
};

const demoProfiles = {
  "durga-puja": {
    name: "Durga Puja",
    palette: ["#7C0D45", "#F5ECF2", "#C43540", "#F8F6F8"],
    headerPreset: "alpana",
    particlePreset: "petals",
    animationPreset: "floating_motifs",
    motifs: {
      garlands: true,
      bells: true,
      paperFans: true,
      leafVines: true,
      diyaGlow: true,
      alpana: true,
      floralCorners: true,
      dholAccent: true
    }
  },
  holi: {
    name: "Holi",
    palette: ["#6D28D9", "#F1EAFE", "#EC4899", "#FCF7FF"],
    headerPreset: "colour_powder",
    particlePreset: "colour_spray",
    animationPreset: "pichkari_spray",
    motifs: { colourBursts: true, confetti: true }
  },
  diwali: {
    name: "Diwali",
    palette: ["#8B2C13", "#FFF0D8", "#E69A18", "#FFF9ED"],
    headerPreset: "diya_lights",
    particlePreset: "warm_lights",
    animationPreset: "controlled_fireworks",
    motifs: {
      garlands: true,
      diyaGlow: true,
      lightStrings: true,
      fireworks: true,
      floralCorners: true
    }
  },
  christmas: {
    name: "Christmas",
    palette: ["#A71930", "#FDECEE", "#1F7A4D", "#F6FBF8"],
    headerPreset: "festive_lights",
    particlePreset: "snow",
    animationPreset: "snow",
    motifs: {
      lightStrings: true,
      bells: true,
      stars: true,
      snow: true,
      silhouettes: true
    }
  },
  "independence-day": {
    name: "Independence Day",
    palette: ["#0A6A3A", "#E8F6EE", "#E87516", "#FFFDF8"],
    headerPreset: "tricolour_ribbon",
    particlePreset: "soft_sparkles",
    animationPreset: "subtle_glow",
    motifs: { ribbons: true, silhouettes: true }
  },
  "eid-al-fitr": {
    name: "Eid al-Fitr",
    palette: ["#087A55", "#DDF7ED", "#B48B2A", "#F4FBF8"],
    headerPreset: "lanterns",
    particlePreset: "stars",
    animationPreset: "lantern_glow",
    motifs: { lanterns: true, stars: true, moonLanterns: true }
  },
  "new-year": {
    name: "New Year",
    palette: ["#3949AB", "#E8EAFB", "#C58A20", "#F7F8FF"],
    headerPreset: "stars",
    particlePreset: "confetti",
    animationPreset: "confetti",
    motifs: { stars: true, confetti: true, fireworks: true }
  },
  "custom-event": {
    name: "WriteX Milestone",
    palette: ["#5516F2", "#EEE7FF", "#E83874", "#F8F6FF"],
    headerPreset: "milestone_ribbon",
    particlePreset: "soft_sparkles",
    animationPreset: "sparkles",
    motifs: { ribbons: true, stars: true }
  }
};

const demoHeaderItems = {
  "durga-puja": [
    ["durga-garland", "garland_band", "center", "none", null, false],
    ["durga-dhaak", "festival_icon", "left", "sway", "drum", true],
    ["durga-bell", "bell", "left_center", "sway", null, false],
    ["durga-medallion", "medallion", "center", "rotate", null, true],
    ["durga-diya", "festival_icon", "right", "glow", "diya", true],
    ["durga-text", "text_badge", "right_center", "float", null, false]
  ],
  holi: [
    ["holi-streamer", "streamer", "left", "streamer", null, false],
    ["holi-colour", "festival_icon", "center", "float", "colour_drop", false],
    ["holi-medallion", "medallion", "right_center", "rotate", null, false]
  ],
  diwali: [
    ["diwali-garland", "garland_band", "center", "none", null, false],
    ["diwali-lantern-left", "lantern", "left", "sway", null, false],
    ["diwali-diya", "festival_icon", "center", "glow", "diya", true],
    ["diwali-lantern-right", "lantern", "right", "sway", null, false]
  ],
  christmas: [
    ["christmas-garland", "garland_band", "center", "none", null, false],
    ["christmas-bell", "bell", "left_center", "sway", null, false],
    ["christmas-star", "festival_icon", "center", "glow", "star", false],
    ["christmas-medallion", "medallion", "right_center", "rotate", null, false]
  ],
  "eid-al-fitr": [
    ["eid-lantern-left", "lantern", "left", "sway", null, false],
    ["eid-crescent", "festival_icon", "center", "float", "crescent", true],
    ["eid-lantern-right", "lantern", "right", "sway", null, false]
  ],
  "independence-day": [
    ["national-ribbon", "animated_ribbon", "center", "streamer", null, false],
    ["national-chakra", "festival_icon", "center", "rotate", "chakra", true],
    ["national-streamer", "streamer", "right", "streamer", null, false]
  ],
  "new-year": [
    ["new-year-ribbon", "animated_ribbon", "center", "streamer", null, false],
    ["new-year-star", "festival_icon", "left_center", "glow", "star", false],
    ["new-year-medallion", "medallion", "right_center", "rotate", null, false]
  ],
  "custom-event": [
    ["custom-ribbon", "animated_ribbon", "center", "streamer", null, false],
    ["custom-medallion", "medallion", "right_center", "sway", null, false]
  ]
};

function headerOrnamentConfig(slug, density, reducedMotion, palette) {
  const sourceItems = demoHeaderItems[slug] || demoHeaderItems["custom-event"];
  const [colour, , secondaryColour] = palette;
  return {
    mode: slug === "custom-event" ? "mixed" : "festival_default",
    enabled: true,
    density: density === "subtle" ? "minimal" : density,
    animationEnabled: !reducedMotion,
    motionLevel: reducedMotion ? "off" : "subtle",
    mobileSimplified: true,
    ornamentCount: sourceItems.length,
    garlandEnabled: true,
    textBadgeEnabled: true,
    approvedCulturalArtworkEnabled: true,
    items: sourceItems.map(
      ([id, type, position, motion, icon, culturalAssetApproved], index) => ({
        id,
        type,
        enabled: true,
        position,
        hangingLength: 14 + (index % 4) * 6,
        scale: 0.9 + (index % 3) * 0.08,
        motion,
        mobileVisible: index < 3 && type !== "text_badge",
        colour,
        secondaryColour,
        culturalAssetApproved,
        assetVariant: null,
        icon,
        text: type === "text_badge" ? "Shubho Durga Puja" : null,
        language: type === "text_badge" ? "English" : null,
        mobileFallbackText: null
      })
    )
  };
}

function demoAudioBuffer() {
  const sampleRate = 8000;
  const samples = 1600;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + samples * 2, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const envelope = 1 - index / samples;
    const value = Math.sin((index / sampleRate) * Math.PI * 2 * 440);
    bytes.writeInt16LE(Math.round(value * envelope * 1600), 44 + index * 2);
  }
  return bytes;
}

function densityFromReferer(referer) {
  try {
    const density = new URL(referer).searchParams.get("festivalDensity");
    return ["subtle", "balanced", "rich"].includes(density)
      ? density
      : "balanced";
  } catch {
    return "balanced";
  }
}

function reducedMotionFromReferer(referer) {
  try {
    return new URL(referer).searchParams.get("reduced") === "1";
  } catch {
    return false;
  }
}

function profileFromReferer(referer) {
  try {
    const requested = new URL(referer).searchParams.get("festivalTheme");
    return demoProfiles[requested] || demoProfiles["durga-puja"];
  } catch {
    return demoProfiles["durga-puja"];
  }
}

function themePayload(referer) {
  const density = densityFromReferer(referer);
  const reducedMotion = reducedMotionFromReferer(referer);
  const profile = profileFromReferer(referer);
  const slug =
    Object.entries(demoProfiles).find(([, candidate]) => candidate === profile)?.[0] ||
    "durga-puja";
  const [accent, accentSoft, accentWarm, surfaceTint] = profile.palette;
  const palette = {
    accent,
    accentSoft,
    accentWarm,
    textOnAccent: "#FFFFFF",
    surfaceTint
  };

  return {
    data: {
      experience: {
        theme: {
          id: `qa-${slug}-festival-experience`,
          slug,
          name: profile.name,
          festivalType: "religious_festival",
          scope: "entire_public",
          selectedRoutes: [],
          applyToHeader: true,
          applyToFooter: true,
          applyToHomepage: true,
          applyToLoginScreens: true,
          applyToClientLogin: true,
          applyToEmployeeLogin: true,
          applyToAdminLogin: false,
          applyMatchingWebsitePalette: true,
          applyAxoTheme: true,
          applyToSelectedRoutes: false,
          palette,
          paletteMatchMode: "balanced_writex",
          experienceLevel: density === "rich" ? "enhanced" : "standard",
          animationLevel: reducedMotion ? "none" : "subtle",
          experienceConfig: {
            version: 1,
            headerPreset: profile.headerPreset,
            heroPreset:
              profile.name === "Independence Day" ||
              profile.name === "New Year"
                ? "festive_ribbon"
                : "corner_cluster",
            innerPagePreset: "section_accents",
            footerPreset:
              profile.name === "Diwali" ||
              profile.name === "Christmas" ||
              profile.name === "Eid al-Fitr"
                ? "light_trim"
                : "motif_band",
            particlePreset: profile.particlePreset,
            animationPreset: reducedMotion
              ? "none"
              : profile.animationPreset,
            animationEnabled: !reducedMotion,
            animationIntensity: density === "rich" ? "medium" : "low",
            desktopOnly: false,
            mobileSimplified: true,
            culturallySensitiveArtwork: true,
            copyReviewStatus: "approved",
            approvalStatus: "approved",
            headerOrnaments: headerOrnamentConfig(
              slug,
              density,
              reducedMotion,
              profile.palette
            ),
            interpretation: {
              sourceMode: "reference_image",
              publicArtworkMode: "interpreted_motifs",
              headerDensity: density,
              pageCoverage: "full_website",
              motion: reducedMotion ? "off" : "subtle",
              regions: {
                header: true,
                hero: true,
                innerPages: true,
                footer: true,
                login: true,
                axo: true
              },
              motifs: {
                ...baseMotifs,
                ...profile.motifs
              }
            },
            sound: {
              available: true,
              enabled: true,
              defaultState: "off",
              loop: true,
              volume: 0.25,
              desktopOnly: false,
              mobileEnabled: true,
              stopOnRouteExit: true,
              stopOnThemeEnd: true,
              showUserControl: true,
              startMode: "user_interaction",
              rememberPreference: true,
              culturallyReviewed: true
            },
            accessibility: {
              decorativeAssetsHidden: true,
              preserveTextContrast: true,
              avoidFormOverlap: true,
              avoidRapidFlashing: true,
              reducedMotionPreset: "static_accent",
              silentFallback: true
            }
          },
          assetAvailability: ["partial", "ready_to_activate"],
          announcementBarEnabled: false,
          announcementBarText: null,
          announcementBarCtaLabel: null,
          announcementBarCtaHref: null,
          motif: profile.headerPreset.replaceAll("_", "-"),
          axoAccessory: "festival-garland",
          assets: {
            audio: `http://127.0.0.1:${port}/__festival-demo.wav`
          },
          ornamentAssets: {}
        },
        preview: true,
        resolvedAt: new Date().toISOString()
      }
    }
  };
}

function copyRequestHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (!value) continue;
    if (
      ["connection", "content-length", "host", "upgrade"].includes(name) ||
      name.startsWith("sec-websocket-")
    ) {
      continue;
    }
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  headers.set("host", upstreamHost);
  return headers;
}

function copyResponseHeaders(upstream, response) {
  for (const [name, value] of upstream.headers) {
    if (
      [
        "connection",
        "content-encoding",
        "content-length",
        "transfer-encoding"
      ].includes(name)
    ) {
      continue;
    }
    if (name === "location") {
      response.setHeader(
        name,
        value.replace(upstreamOrigin, `http://127.0.0.1:${port}`)
      );
      continue;
    }
    response.setHeader(name, value);
  }
  response.setHeader("cache-control", "private, no-store");
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(
      request.url || "/",
      `http://127.0.0.1:${port}`
    );

    if (requestUrl.pathname === "/__festival-demo.wav") {
      const audio = demoAudioBuffer();
      response.writeHead(200, {
        "cache-control": "private, no-store",
        "content-length": String(audio.length),
        "content-type": "audio/wav",
        "x-robots-tag": "noindex, nofollow"
      });
      response.end(audio);
      return;
    }

    if (requestUrl.pathname === "/api/website-experience/theme") {
      console.log(
        `Festival QA theme response: ${profileFromReferer(request.headers.referer || "").name}`
      );
      const body = JSON.stringify(themePayload(request.headers.referer || ""));
      response.writeHead(200, {
        "cache-control": "private, no-store",
        "content-type": "application/json; charset=utf-8",
        "x-robots-tag": "noindex, nofollow"
      });
      response.end(body);
      return;
    }

    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const upstream = await fetch(`${upstreamOrigin}${requestUrl.pathname}${requestUrl.search}`, {
      method: request.method,
      headers: copyRequestHeaders(request),
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : body,
      redirect: "manual"
    });
    const upstreamBody = Buffer.from(await upstream.arrayBuffer());
    response.statusCode = upstream.status;
    copyResponseHeaders(upstream, response);
    response.end(upstreamBody);
  } catch (error) {
    response.writeHead(502, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8"
    });
    response.end(
      JSON.stringify({
        error: "Festival QA preview proxy could not reach the upstream site."
      })
    );
    console.error(
      error instanceof Error
        ? `${error.message}: ${error.cause instanceof Error ? error.cause.message : ""}`
        : String(error)
    );
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Festival QA preview: http://127.0.0.1:${port} -> ${upstreamOrigin}`
  );
});
