export type AxoStoryVariant = "client" | "employee";
export type AxoRenderMode = "image-depth" | "model";

export type AxoStoryBeat = {
  title: string;
  description: string;
};

export const AXO_MODEL_PATH = "/models/axo/axo-rigged.glb";
export const AXO_RENDER_MODE: AxoRenderMode = "image-depth";

export const axoStories: Record<AxoStoryVariant, AxoStoryBeat[]> = {
  client: [
    {
      title: "Your work. Your progress. Your access.",
      description: "One secure workspace for status, payment, preview, and delivery."
    },
    {
      title: "Everything important, in one place.",
      description: "Sign in to see the current stage and the next action."
    },
    {
      title: "Ready when you are.",
      description: "Use your verified access details to enter your workspace."
    }
  ],
  employee: [
    {
      title: "One workplace. The right view for every role.",
      description: "Your WriteX workspace begins with one secure sign-in."
    },
    {
      title: "Your access follows your role.",
      description: "Department, hierarchy, permissions, and navigation are resolved after authentication."
    },
    {
      title: "Your workspace is ready to be prepared.",
      description: "Sign in and WriteX will route you to the tools assigned to you."
    }
  ]
};

export function getAxoStoryIndex(progress: number) {
  if (progress < 0.32) return 0;
  if (progress < 0.68) return 1;
  return 2;
}
