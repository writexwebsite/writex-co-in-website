import type {
  MyWritexCustomer,
  MyWritexExperienceState,
  MyWritexPendingAction,
  MyWritexProject,
} from "@/lib/my-writex/types";

export const myWritexFixtureStates: Array<{
  key: MyWritexExperienceState;
  label: string;
  customer: string;
}> = [
  { key: "active", label: "Active + job seeking", customer: "Customer A" },
  { key: "no_active_project", label: "Established · no active project", customer: "Customer B" },
  { key: "new", label: "New to WriteX", customer: "Customer C" },
  { key: "quality_concern", label: "Quality concern", customer: "Customer D" },
  { key: "established", label: "Established relationship", customer: "Established" },
  { key: "job_seeking", label: "Job seeking", customer: "Career focus" },
  { key: "payment_pressure", label: "Payment pressure", customer: "Payment focus" },
  { key: "graduating", label: "Graduating", customer: "Graduation focus" },
];

export function parseMyWritexState(value?: string): MyWritexExperienceState {
  if (value === "established_no_active") return "no_active_project";
  return myWritexFixtureStates.some((item) => item.key === value)
    ? (value as MyWritexExperienceState)
    : "active";
}

export type MyWritexPresentation = {
  state: MyWritexExperienceState;
  activeProjects: MyWritexProject[];
  recentProjects: MyWritexProject[];
  pendingActions: MyWritexPendingAction[];
  identityLine: string;
  todayTitle: string;
  todayCopy: string;
  careerTitle: string;
  careerCopy: string;
  nextDeadline: { label: string; date: string; href: string } | null;
};

export function getMyWritexPresentation(
  customer: MyWritexCustomer,
  state: MyWritexExperienceState,
): MyWritexPresentation {
  const activeProjects = customer.projects.filter((project) => project.phase === "active");
  const recentProjects = customer.projects.filter((project) =>
    ["delivered", "completed"].includes(project.phase),
  );
  const fallbackDeadline = customer.upcomingWork[0]
    ? {
        label: customer.upcomingWork[0].title,
        date: customer.upcomingWork[0].targetDate,
        href: "/my-writex/plan",
      }
    : null;

  if (state === "no_active_project") {
    return {
      state,
      activeProjects: [],
      recentProjects,
      pendingActions: [],
      identityLine: `${customer.summary.completedProjects} completed projects · known preferences · calm today`,
      todayTitle: "Everything is calm.",
      todayCopy: "No active project needs your attention. Your history and planned work are ready when you need them.",
      careerTitle: "Keep career momentum warm",
      careerCopy: "Three analyst roles match your profile this week.",
      nextDeadline: fallbackDeadline,
    };
  }

  if (state === "new") {
    return {
      state,
      activeProjects: [],
      recentProjects: [],
      pendingActions: [],
      identityLine: "A focused place for your work and career",
      todayTitle: "Let’s set up what matters first.",
      todayCopy: "Tell WriteX about your first requirement or complete your career direction—one clear step is enough.",
      careerTitle: "Build your career direction",
      careerCopy: "Add target roles and locations to make Job Radar useful.",
      nextDeadline: null,
    };
  }

  if (state === "quality_concern") {
    const qualityProject = activeProjects.find((project) => project.status === "quality_review");
    return {
      state,
      activeProjects: qualityProject ? [qualityProject] : activeProjects.slice(0, 1),
      recentProjects,
      pendingActions: [
        {
          id: "quality-recovery",
          title: "Tell us what does not feel right",
          context: qualityProject?.title || "Your active project",
          href: qualityProject
            ? `/my-writex/projects/${qualityProject.id}#support`
            : "/my-writex/support",
          tone: "attention",
        },
      ],
      identityLine: "Your concern is visible · your manager has context",
      todayTitle: "Let’s get this back on track.",
      todayCopy: "Open the project, describe the concern, and keep every next step visible in one place.",
      careerTitle: "Career tools can wait",
      careerCopy: "Your project concern is the priority today.",
      nextDeadline: qualityProject
        ? { label: qualityProject.title, date: qualityProject.deliveryDate, href: `/my-writex/projects/${qualityProject.id}` }
        : fallbackDeadline,
    };
  }

  if (state === "payment_pressure") {
    const paymentProject = customer.projects.find((project) => project.status === "payment_pending");
    return {
      state,
      activeProjects,
      recentProjects,
      pendingActions: customer.pendingActions.filter((action) => action.tone === "payment"),
      identityLine: "Your work continues · payment details stay clear",
      todayTitle: "One payment item needs a look.",
      todayCopy: "Review the verified invoice position and contact your manager if you need to discuss timing.",
      careerTitle: "Keep applications moving",
      careerCopy: "Your saved career work stays available while you resolve payment timing.",
      nextDeadline: paymentProject
        ? { label: paymentProject.title, date: paymentProject.deliveryDate, href: "/my-writex/invoices" }
        : fallbackDeadline,
    };
  }

  const careerLed = state === "job_seeking" || state === "graduating";
  const priorityProject = activeProjects.find((project) => project.status === "quality_review") || activeProjects[0];
  return {
    state,
    activeProjects,
    recentProjects,
    pendingActions: customer.pendingActions,
    identityLine: state === "established"
      ? `${customer.summary.completedProjects} completed projects · a relationship built since ${customer.relationshipSince}`
      : careerLed
      ? state === "graduating"
        ? "Graduation ahead · work and career in one place"
        : "Active projects · active job search"
      : "Preferred client · active work · career-ready",
    todayTitle: careerLed ? "Your next career move is taking shape." : "Here is what matters now.",
    todayCopy: careerLed
      ? "Keep applications moving while WriteX handles the work already in progress."
      : "One project is in Quality Review, one item needs your input, and your strongest job matches are ready.",
    careerTitle: state === "graduating" ? "Your graduation runway" : "Three roles worth a closer look",
    careerCopy: state === "graduating"
      ? "Connect your CV, applications and interview preparation before September."
      : "Fresh analyst and research roles matched to your career profile.",
    nextDeadline: priorityProject
      ? { label: priorityProject.title, date: priorityProject.deliveryDate, href: `/my-writex/projects/${priorityProject.id}` }
      : fallbackDeadline,
  };
}
