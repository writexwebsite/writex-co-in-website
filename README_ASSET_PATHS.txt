WriteX Axo Login Assets — Ready Folder Structure
================================================

PRIMARY AXO ASSET
------------------
public/images/auth/axo/hero-art-blended.png

Browser/Next.js path:
  /images/auth/axo/hero-art-blended.png

This is the approved Axo seated on the multicolour WriteX X.
It is an RGBA PNG (842 × 1086) and is the source texture for the current
2.5D WebGL login scrollytelling.

SUPPORTING ASSETS
-----------------
public/images/auth/axo/background-facets.svg
  Optional login background facets.

public/images/auth/axo/writex-logo.png
  Login-package logo asset. Prefer the site's existing official logo if it
  is already implemented and higher quality.

OPTIMIZED STATIC FALLBACKS
--------------------------
public/images/auth/axo/axo-login-desktop.webp
public/images/auth/axo/axo-login-tablet.webp
public/images/auth/axo/axo-login-mobile.webp

Use these when WebGL is unavailable, reduced motion is enabled, or on mobile.

NEXT.JS DESTINATION
-------------------
Copy the included `public` directory into the root of the Next.js project.

Final source paths:
  <project-root>/public/images/auth/axo/hero-art-blended.png
  <project-root>/public/images/auth/axo/background-facets.svg
  <project-root>/public/images/auth/axo/writex-logo.png

ANGULAR DESTINATION
-------------------
If Employee Login is a separate Angular app, copy the files inside
`public/images/auth/axo/` to:

  <angular-project>/src/assets/auth/axo/

Angular template paths:
  assets/auth/axo/hero-art-blended.png
  assets/auth/axo/axo-login-desktop.webp
  assets/auth/axo/axo-login-tablet.webp
  assets/auth/axo/axo-login-mobile.webp

IMPORTANT
---------
- Do not use Mascots Zip.zip for the initial login scrollytelling.
- Do not use the robot mascot assets on Client Login or Employee Login.
- Axo is the only cinematic login subject.
- No rigged Axo GLB/GLTF model is included.
- Current WebGL implementation must use image-depth / 2.5D mode.
- A future true 3D model should be placed at:
    public/models/axo/axo-rigged.glb