import assert from "node:assert/strict";
import test from "node:test";
import { hiringApplicationSchema } from "../../lib/hiring/application-schema";

const base = {
  fullName: "Sanitised Candidate",
  email: "candidate@example.com",
  mobile: "9876543210",
  city: "Kolkata",
  qualification: "Postgraduate",
  experience: "Three years of relevant, verifiable experience.",
  availability: "Full-time",
  compensation: "Discuss during review",
  noticePeriod: "Thirty days",
  workMode: "Hybrid",
  relationship: { knowsApplicantOrEmployee: false },
  consent: true as const,
  assessmentMonitoringConsent: true as const,
  declaration: true as const
};

test("Subject Matter Expert applications retain writer-specific validation", () => {
  const valid = hiringApplicationSchema.safeParse({
    ...base,
    role: "academic_writer",
    aiUsageDisclosure: "I use approved grammar tools and disclose substantive AI assistance.",
    roleDetails: {
      subjectExpertise: "Management",
      academicLevels: "Undergraduate and postgraduate",
      writingExperience: "2-4 years",
      researchExperience: "Database and source evaluation experience.",
      editingExperience: "Structural editing and proofreading.",
      referencingStyles: "Harvard and APA",
      aiUsageSelection: "I use AI for editing/grammar",
      fullTimeCommitment: "Yes",
      currentEmploymentStatus: "Employed and serving notice",
      joiningAvailability: "Within 30 days"
    }
  });
  assert.equal(valid.success, true);
  const incomplete = hiringApplicationSchema.safeParse({
    ...base,
    role: "academic_writer",
    roleDetails: { subjectExpertise: "Management" }
  });
  assert.equal(incomplete.success, false);
});

test("Sales Executive applications require the approved sales evidence fields", () => {
  const valid = hiringApplicationSchema.safeParse({
    ...base,
    role: "sales_executive",
    videoIntroductionConsent: true,
    roleDetails: {
      totalExperience: "2-4 years",
      previousIndustry: "Education services",
      languages: "English, Hindi",
      languageProficiency: "Professional",
      communicationComfort: "Voice, WhatsApp and email",
      leadHandling: "Inbound lead qualification",
      targetHistory: "Monthly target ownership",
      conversionExperience: "Consultative conversion",
      objectionHandling: "Clarify scope and address risk without false promises",
      salaryStructure: "Fixed + incentive",
      fullTimeCommitment: "Yes",
      currentEmploymentStatus: "Employed and serving notice",
      joiningAvailability: "Within 30 days"
    }
  });
  assert.equal(valid.success, true);
  const incomplete = hiringApplicationSchema.safeParse({
    ...base,
    role: "sales_executive",
    roleDetails: { languages: "English" }
  });
  assert.equal(incomplete.success, false);
});

test("Sales Fresher applications do not require previous-employment evidence", () => {
  const fresher = hiringApplicationSchema.safeParse({
    ...base,
    role: "sales_executive",
    videoIntroductionConsent: true,
    roleDetails: {
      totalExperience: "Fresher",
      languages: "English, Hindi",
      languageProficiency: "Professional",
      communicationComfort: "Voice, WhatsApp and email",
      objectionHandling: "Would clarify the customer's concern before answering",
      salaryStructure: "Fixed + incentive",
      fullTimeCommitment: "Yes",
      currentEmploymentStatus: "Not currently employed",
      joiningAvailability: "Immediate"
    }
  });
  assert.equal(fresher.success, true);
});

test("rejects non-full-time engagement values in new public applications", () => {
  const result = hiringApplicationSchema.safeParse({
    ...base,
    role: "academic_writer",
    availability: "Freelance",
    aiUsageDisclosure: "No AI use.",
    roleDetails: {
      subjectExpertise: "Management",
      academicLevels: "Postgraduate",
      writingExperience: "2-4 years",
      researchExperience: "Advanced",
      editingExperience: "Advanced",
      referencingStyles: "Harvard",
      aiUsageSelection: "I do not use AI tools",
      fullTimeCommitment: "Yes",
      currentEmploymentStatus: "Not currently employed",
      joiningAvailability: "Immediate"
    }
  });
  assert.equal(result.success, false);
});
