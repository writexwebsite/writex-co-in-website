"use client";

import { AxoImageDepthScene } from "./AxoImageDepthScene";

// The approved package contains no rigged GLB. Keeping this boundary lets a future
// model replace the image plane without changing scroll, fallback, or auth logic.
export const AxoModelScene = AxoImageDepthScene;
