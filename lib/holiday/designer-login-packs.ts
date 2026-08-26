export type DesignerLoginPack = {
  id: string;
  version: number;
  name: string;
  festivalSlug: string;
  assets: {
    backgroundFourThree: string;
    backgroundWide: string;
    backgroundUltrawide: string;
    logo: string;
    hero: string | null;
  };
  integrity: {
    backgroundFourThreeSha256: string;
    backgroundWideSha256: string;
    backgroundUltrawideSha256: string;
    logoSha256: string;
    sourceReferenceSha256: string;
  };
  completeness: {
    responsiveBackgrounds: "approved";
    logo: "approved";
    formTokens: "approved";
    heroLayer: "approved_reference_8k";
    usesSceneBackgroundFallback: false;
    containsEmbeddedLoginUi: false;
    singleRealFormRequired: true;
  };
  mobileModes: readonly [
    "form_only",
    "compact_hero_form",
    "background_form"
  ];
  defaultMobileMode: "background_form";
  activationReady: true;
};

const independenceDayPack: DesignerLoginPack = {
  id: "independence-day-designer-v1",
  version: 5,
  name: "Independence Day Designer Pack",
  festivalSlug: "independence-day",
  assets: {
    backgroundFourThree:
      "/designer-login-packs/independence-day-v2/background-4x3-8k.webp?v=4",
    backgroundWide:
      "/designer-login-packs/independence-day-v2/background-wide-8k.webp?v=4",
    backgroundUltrawide:
      "/designer-login-packs/independence-day-v2/background-ultrawide-8k.webp?v=5",
    logo: "/designer-login-packs/independence-day-v2/writex-logo.png",
    hero:
      "/designer-login-packs/independence-day-v2/background-4x3-8k.webp?v=4"
  },
  integrity: {
    backgroundFourThreeSha256:
      "2d63dcb0d062bae3f42b2cac6794b5a25f9fceb04ffa6b09e8a12d789c5a945b",
    backgroundWideSha256:
      "b10015953d05631899b53b5ff73d5024de5c296e4eac79fe13d2537918e283cf",
    backgroundUltrawideSha256:
      "37b450c7fb02c29aff1821d2f7d0aea71ed3c10a8b4402b06db14de6486020e3",
    logoSha256:
      "d34063c83d25a2e1862eaba7a62ee73627d1a2d39472a414c5a46edee54c0216",
    sourceReferenceSha256:
      "4df8c469a301c60c50e004b0ae3845a46876f980370262eadf85903a2e62b274"
  },
  completeness: {
    responsiveBackgrounds: "approved",
    logo: "approved",
    formTokens: "approved",
    heroLayer: "approved_reference_8k",
    usesSceneBackgroundFallback: false,
    containsEmbeddedLoginUi: false,
    singleRealFormRequired: true
  },
  mobileModes: ["form_only", "compact_hero_form", "background_form"],
  defaultMobileMode: "background_form",
  activationReady: true
};

export const DESIGNER_LOGIN_PACKS = [independenceDayPack] as const;

export function findDesignerLoginPack(id: string | null | undefined) {
  return DESIGNER_LOGIN_PACKS.find((pack) => pack.id === id) || null;
}
