export type AxoServiceId =
  | "coursework"
  | "dissertation"
  | "sop"
  | "editing"
  | "originality"
  | "formatting";

export type AxoState =
  | "idle"
  | "welcoming"
  | "attentive"
  | "curious"
  | "thinking"
  | "guiding"
  | "reassuring"
  | "waiting"
  | "concerned"
  | "pleased"
  | "successful"
  | "unavailable";

export type AxoBrief = {
  serviceId?: AxoServiceId;
  subject?: string;
  title?: string;
  academicLevel?: string;
  countrySystem?: string;
  wordCount?: string;
  deadline?: string;
  deadlineTime?: string;
  timezone?: string;
  referencingStyle?: string;
  requiredSources?: string;
  instructions?: string;
  degreeLevel?: string;
  chapterRequirement?: string;
  methodology?: string;
  proposalStatus?: string;
  supervisorFeedback?: string;
  dataAvailability?: string;
  sopPurpose?: string;
  targetProgramme?: string;
  academicBackground?: string;
  workExperience?: string;
  careerObjective?: string;
  draftAvailability?: string;
  documentType?: string;
  editingLevel?: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  preferredContact?: string;
  consent?: boolean;
  files?: Array<{ name: string; size: number; type: string; assetId?: string }>;
};

export type AxoService = {
  id: AxoServiceId;
  label: string;
  shortDescription: string;
  path: string;
  fields: Array<keyof AxoBrief>;
  manualReview: boolean;
};

export type AxoAnalyticsEvent =
  | "axo_opened"
  | "axo_dismissed"
  | "new_assignment_started"
  | "service_selected"
  | "brief_step_completed"
  | "brief_completed"
  | "quote_requested"
  | "file_upload_started"
  | "file_upload_completed"
  | "file_upload_failed"
  | "existing_order_support_started"
  | "revision_request_started"
  | "human_handoff_requested"
  | "enquiry_reviewed"
  | "enquiry_submitted"
  | "session_resumed"
  | "fallback_answer_shown";
