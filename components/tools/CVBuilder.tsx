"use client";

import { GuidedBuilder } from "./GuidedBuilder";
import { quoteTrackingEvents } from "@/lib/tracking";

const initialValues = { layout: "Academic CV", name: "", contact: "", location: "", profile: "", qualification: "", institution: "", educationDates: "", educationEvidence: "", experience: "", projects: "", responsibilities: "", outcomes: "", skills: "", achievements: "", languages: "", target: "" };

export function CVBuilder() {
  return <GuidedBuilder
    toolType="cv_builder"
    title="CV Builder"
    description="Create a clear academic or graduate CV without invented claims."
    initialValues={initialValues}
    startEvent={quoteTrackingEvents.cvBuilderStarted}
    stepEvent={quoteTrackingEvents.cvBuilderStepCompleted}
    previewEvent={quoteTrackingEvents.cvBuilderPreviewGenerated}
    completedEvent={quoteTrackingEvents.cvBuilderCompleted}
    upsell="Need a human review before using your CV? WriteX can review clarity, relevance, presentation, and alignment with your target."
    steps={[
      { title: "Basic Profile", description: "Start with accurate contact details and a concise direction.", fields: [
        { name: "layout", label: "Layout", type: "select", required: true, options: ["Academic CV", "Graduate CV", "Early-Career CV"] },
        { name: "name", label: "Full name", required: true, placeholder: "Your full name" },
        { name: "contact", label: "Email and phone", required: true, placeholder: "name@example.com | +44..." },
        { name: "location", label: "Location", placeholder: "City, country" },
        { name: "profile", label: "Profile summary", type: "textarea", placeholder: "Your academic direction, relevant strengths, and target" }
      ]},
      { title: "Education", description: "Record the qualification and evidence most relevant to your target.", fields: [
        { name: "qualification", label: "Qualification", required: true, placeholder: "MSc Management" },
        { name: "institution", label: "Institution", required: true, placeholder: "University name" },
        { name: "educationDates", label: "Dates", placeholder: "2024 - 2026" },
        { name: "educationEvidence", label: "Relevant modules, dissertation, or achievement", type: "textarea" }
      ]},
      { title: "Experience and Projects", description: "Use truthful evidence to show what you did and what it demonstrates.", fields: [
        { name: "experience", label: "Experience", type: "textarea", placeholder: "Role, organisation, dates, responsibilities" },
        { name: "projects", label: "Projects", type: "textarea", placeholder: "Project purpose, method, and your contribution" },
        { name: "responsibilities", label: "Key actions", type: "textarea", placeholder: "Actions you personally completed" },
        { name: "outcomes", label: "Evidence or outcomes", type: "textarea", placeholder: "Accurate result, learning, or contribution" }
      ]},
      { title: "Skills and Achievements", description: "Prioritise skills you can support with real evidence.", fields: [
        { name: "skills", label: "Skills", required: true, type: "textarea", placeholder: "Research methods, software, communication" },
        { name: "achievements", label: "Achievements", type: "textarea", placeholder: "Awards, publications, presentations, leadership" },
        { name: "languages", label: "Languages", placeholder: "Language and proficiency" },
        { name: "target", label: "Target course or role", placeholder: "PhD application or graduate analyst role" }
      ]},
      { title: "Preview and Download", description: "Review the structure before unlocking your PDF.", fields: [] }
    ]}
    buildDocument={(values) => ({
      title: values.name || `${values.layout} Preview`,
      subtitle: [values.contact, values.location, values.profile].filter(Boolean).join(" | "),
      sections: [
        { heading: "Education", lines: [[values.qualification, values.institution, values.educationDates].filter(Boolean).join(" - "), values.educationEvidence] },
        { heading: "Experience and Projects", lines: [values.experience, values.projects, values.responsibilities, values.outcomes] },
        { heading: "Skills and Achievements", lines: [values.skills, values.achievements, values.languages] }
      ]
    })}
  />;
}

