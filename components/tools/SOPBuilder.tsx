"use client";

import { GuidedBuilder } from "./GuidedBuilder";
import { quoteTrackingEvents } from "@/lib/tracking";

const initialValues = { programme: "", country: "", institution: "", deadline: "", qualification: "", subjects: "", project: "", experience: "", evidence: "", motivation: "", programmeFit: "", careerDirection: "", missingInfo: "", checklist: "" };

export function SOPBuilder() {
  return <GuidedBuilder
    toolType="sop_builder"
    title="SOP Builder"
    description="Plan an evidence-led statement framework for your own drafting and review."
    initialValues={initialValues}
    startEvent={quoteTrackingEvents.sopBuilderStarted}
    stepEvent={quoteTrackingEvents.sopBuilderStepCompleted}
    previewEvent={quoteTrackingEvents.sopBuilderPreviewGenerated}
    completedEvent={quoteTrackingEvents.sopBuilderCompleted}
    upsell="Get this SOP framework reviewed and refined by WriteX through a learning-focused admissions support pathway."
    steps={[
      { title: "Target Programme and Country", description: "Define the application context before planning the narrative.", fields: [
        { name: "programme", label: "Target programme", required: true, placeholder: "MSc Management" },
        { name: "country", label: "Target country", required: true, placeholder: "United Kingdom" },
        { name: "institution", label: "Institution", placeholder: "University name" },
        { name: "deadline", label: "Application deadline", type: "date" }
      ]},
      { title: "Academic Background", description: "Select evidence that demonstrates preparation for the programme.", fields: [
        { name: "qualification", label: "Current or most recent qualification", required: true },
        { name: "subjects", label: "Relevant modules or themes", type: "textarea", required: true },
        { name: "project", label: "Relevant project or research", type: "textarea" }
      ]},
      { title: "Experience and Evidence", description: "Connect experience to concrete learning, responsibility, and readiness.", fields: [
        { name: "experience", label: "Relevant experience", type: "textarea", placeholder: "Placement, employment, volunteering, or project" },
        { name: "evidence", label: "What this experience demonstrates", type: "textarea", required: true }
      ]},
      { title: "Motivation and Programme Fit", description: "Move beyond generic praise by identifying specific fit.", fields: [
        { name: "motivation", label: "Why this field now?", type: "textarea", required: true },
        { name: "programmeFit", label: "Why this programme?", type: "textarea", required: true, placeholder: "Relevant modules, research, teaching, or facilities" }
      ]},
      { title: "Career Direction", description: "State a credible next step and identify any evidence still missing.", fields: [
        { name: "careerDirection", label: "Career direction", type: "textarea", required: true },
        { name: "missingInfo", label: "Missing information to verify", type: "textarea" },
        { name: "checklist", label: "Editing checks to remember", type: "textarea", placeholder: "Specificity, evidence, transitions, word limit" }
      ]},
      { title: "Framework Preview and Download", description: "This is a planning framework, not an admission-guaranteed final statement.", fields: [] }
    ]}
    buildDocument={(values) => ({
      title: `SOP Framework: ${values.programme || "Target Programme"}`,
      subtitle: [values.institution, values.country, values.deadline ? `Deadline ${values.deadline}` : ""].filter(Boolean).join(" | "),
      sections: [
        { heading: "Opening direction", lines: [values.motivation, "Connect motivation to a specific academic question or experience."] },
        { heading: "Academic preparation", lines: [values.qualification, values.subjects, values.project] },
        { heading: "Experience and evidence", lines: [values.experience, values.evidence] },
        { heading: "Programme fit", lines: [values.programmeFit, "Explain why the selected elements support the next stage of your development."] },
        { heading: "Career direction", lines: [values.careerDirection] },
        { heading: "Missing information and editing checklist", lines: [values.missingInfo || "Verify programme-specific evidence.", values.checklist || "Check specificity, evidence, transitions, accuracy, and word limit."] }
      ]
    })}
  />;
}

