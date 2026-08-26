import { createHash, randomInt } from "crypto";
import type { HiringRole } from "@/lib/hiring/domain";

export type AssessmentQuestionVersion = {
  id: string;
  version: number;
  role: HiringRole;
  category: string;
  section: string;
  difficulty: "foundation" | "intermediate" | "advanced";
  prompt: string;
  title?: string;
  instructions?: string;
  sourceMaterial?: string;
  answerType?: string;
  expectedTimeMinutes?: number;
  maximumScore?: number;
  required?: boolean;
  randomizationEligible?: boolean;
  backNavigationRule?: string;
  humanReviewRequired?: boolean;
  antiCheatSensitivity?: string;
  vivaFollowUpRequired?: boolean;
  displayOrder?: number;
  contentHash?: string;
  protected: boolean;
  active: boolean;
  variants?: string[];
};

export type DeliveredAssessmentQuestion = {
  questionId: string;
  version: number;
  order: number;
  section: string;
  category: string;
  prompt: string;
  title: string;
  instructions: string;
  sourceMaterial: string;
  answerType: string;
  expectedTimeMinutes: number;
  maximumScore: number;
  required: boolean;
  backNavigationRule: string;
  humanReviewRequired: boolean;
  antiCheatSensitivity: string;
  vivaFollowUpRequired: boolean;
  contentHash: string;
};

function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function shuffle<T>(values: T[]) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

export function generateAssessmentForm({
  role,
  questions
}: {
  role: HiringRole;
  questions: AssessmentQuestionVersion[];
}) {
  const eligible = questions.filter(
    (question) => question.active && question.role === role
  );
  const sections = new Map<string, AssessmentQuestionVersion[]>();
  for (const question of eligible) {
    const values = sections.get(question.section) ?? [];
    values.push(question);
    sections.set(question.section, values);
  }

  const delivered = Array.from(sections.entries()).flatMap(([, sectionQuestions]) => {
    const fixed=sectionQuestions.filter(question=>question.randomizationEligible===false).sort((left,right)=>(left.displayOrder??100)-(right.displayOrder??100));
    const random=shuffle(sectionQuestions.filter(question=>question.randomizationEligible!==false));
    return [...fixed,...random];
  });
  const seen = new Set<string>();

  return delivered.map((question, order) => {
    if (seen.has(question.id)) {
      throw new Error("Duplicate question delivery is not permitted.");
    }
    seen.add(question.id);
    const variants = question.variants?.filter(Boolean) ?? [];
    const prompt = variants.length
      ? variants[randomInt(variants.length)]
      : question.prompt;

    return {
      questionId: question.id,
      version: question.version,
      order: order + 1,
      section: question.section,
      category: question.category,
      prompt,
      title: question.title || `Question ${order + 1}`,
      instructions: question.instructions || "",
      sourceMaterial: question.sourceMaterial || "",
      answerType: question.answerType || "long_text",
      expectedTimeMinutes: question.expectedTimeMinutes || 15,
      maximumScore: question.maximumScore || 100,
      required: question.required !== false,
      backNavigationRule: question.backNavigationRule || "session_default",
      humanReviewRequired: question.humanReviewRequired !== false,
      antiCheatSensitivity: question.antiCheatSensitivity || "standard",
      vivaFollowUpRequired: question.vivaFollowUpRequired === true,
      contentHash: question.contentHash || hashContent(`${question.id}:${question.version}:${prompt}`)
    } satisfies DeliveredAssessmentQuestion;
  });
}

export function assertProtectedQuestionMutationAllowed({
  protectedQuestion,
  operation,
  founderAuthorised
}: {
  protectedQuestion: boolean;
  operation: "edit" | "delete" | "activate" | "deactivate";
  founderAuthorised?: boolean;
}) {
  if (
    protectedQuestion &&
    ["edit", "delete"].includes(operation) &&
    !founderAuthorised
  ) {
    throw new Error(
      "Protected base questions require a founder-authorised migration."
    );
  }
}
