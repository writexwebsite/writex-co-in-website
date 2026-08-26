"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutTemplate,
  Loader2,
  Monitor,
  Moon,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  X,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoWithTrademark } from "@/components/LogoWithTrademark";
import {
  FESTIVAL_REVIEW_AXO_CHECKS,
  FESTIVAL_REVIEW_CONTEXTS,
  FESTIVAL_REVIEW_INTERACTION_RESULTS,
  FESTIVAL_REVIEW_SCORE_DIMENSIONS,
  FESTIVAL_REVIEW_UNIVERSAL_CHECKS,
  festivalAxoPlacement,
  festivalReviewChecklistFailures,
  festivalReviewContextKey,
  festivalReviewMissingContexts,
  festivalReviewScore,
  festivalReviewScoreComplete,
  festivalReviewSpecificChecks,
  type FestivalAxoPlacement,
  type FestivalReviewChecklist,
  type FestivalReviewInteractionResult,
  type FestivalReviewScores
} from "@/lib/holiday/festival-review-standard";
import { AdminStatusBadge } from "./AdminPrimitives";

type ReviewState =
  | "visual_review_required"
  | "approved"
  | "rejected"
  | "improvement_requested"
  | "hidden"
  | "source_required";
type ReviewAction = "approve" | "reject" | "request_improvement" | "hide";
type ReviewCollection = "review_first" | "remaining" | "all";
type ReviewBatch = "batch1" | "uat";
type PreviewAppearance = "light" | "dark";
type PreviewViewport = "desktop" | "tablet" | "mobile";
type PreviewMode = "isolated" | "context";
type AxoCheckState = "pass" | "issue";

type ReviewMetadata = {
  provenance?: string;
  version?: number;
  performanceCost?: string;
  axoAnchor?: string | null;
  restrictions?: string[];
  supportedRegions?: string[];
  transparentBackground?: boolean;
  readiness?: Record<string, boolean>;
  motion?: { preset?: string; intensity?: string; duration?: number } | null;
  axoPlacement?: FestivalAxoPlacement | null;
};

type FounderReviewMetadata = {
  collection?: ReviewCollection;
  culturalAttentionAcknowledged?: boolean;
  universalChecklist?: FestivalReviewChecklist;
  specificChecklist?: FestivalReviewChecklist;
  axoChecklist?: Record<string, AxoCheckState>;
  scores?: FestivalReviewScores;
  interactionResult?: FestivalReviewInteractionResult;
};

type VersionConflict = {
  reviewItemId: string;
  existing: {
    libraryAssetId: string;
    versionAssetId: string;
    version: number;
    checksumSha256: string;
    approvalDate: string | null;
    reviewerId: string | null;
  };
  reviewed: {
    version: number;
    checksumSha256: string;
    reviewDate: string;
  };
};

export type FestivalFounderReviewItem = {
  id: string;
  stable_asset_id: string;
  display_name: string;
  festival_slug: string;
  festival_name: string;
  category: string;
  subcategory: string;
  review_state: ReviewState;
  review_note: string | null;
  metadata_json: ReviewMetadata | null;
  founder_review_metadata: FounderReviewMetadata | null;
  width: number;
  height: number;
  checksum_sha256: string;
  reviewed_at: string | null;
  promoted_library_asset_id: string | null;
  promoted_version_asset_id: string | null;
  is_representative: boolean;
  cultural_attention_required: boolean;
  cultural_flags: string[];
  updated_at: string;
  reviewed_in_context: boolean;
  review_context_coverage?: string[];
};

type ReviewBreakdown = {
  dimension: "festival" | "category";
  key: string;
  label: string;
  total: number;
  pending: number;
  approved: number;
  improvement_requested: number;
  rejected: number;
  hidden: number;
};

type ReviewQualityGate = {
  sampleSize: number;
  reviewed: number;
  pending: number;
  approved: number;
  improvementRequested: number;
  rejected: number;
  hidden: number;
  approvalRate: number;
  improvementRate: number;
  rejectionRate: number;
  state: "awaiting_decisions" | "passed" | "stopped";
  canReviewRemaining: boolean;
};

type IntegritySummary = {
  total: number;
  unchecked: number;
  healthy: number;
  missingSource: number;
  checksumMismatch: number;
  invalidMetadata: number;
  brokenDerivative: number;
};

export type FestivalFounderReviewPayload = {
  items: FestivalFounderReviewItem[];
  summary: Record<string, number>;
  breakdowns: ReviewBreakdown[];
  recurringIssues: Array<{ issue: string; count: number }>;
  qualityGate: ReviewQualityGate;
  collection: ReviewCollection;
  filteredCount: number;
  page: number;
  pageSize: number;
  batchKey?: string;
  batchName?: string;
  integrity: IntegritySummary;
};

const festivals = [
  "",
  "independence-day",
  "diwali",
  "holi",
  "durga-puja",
  "eid",
  "christmas",
  "shared"
];
const categories = ["", "header", "ground", "axo", "ambient", "feature"];
const states = [
  "",
  "visual_review_required",
  "approved",
  "improvement_requested",
  "rejected",
  "hidden",
  "source_required"
];

const axoChecks = FESTIVAL_REVIEW_AXO_CHECKS;

const decisionCopy: Record<ReviewAction, { label: string; verb: string }> = {
  approve: { label: "Approve", verb: "approve" },
  request_improvement: {
    label: "Needs Improvement",
    verb: "mark as needing improvement"
  },
  reject: { label: "Reject", verb: "reject" },
  hide: { label: "Hide", verb: "hide" }
};

function humanise(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(state: ReviewState) {
  if (state === "approved") return "success" as const;
  if (state === "rejected") return "danger" as const;
  if (state === "hidden") return "neutral" as const;
  return "warning" as const;
}

export function FestivalFounderReview({
  initial
}: {
  initial: FestivalFounderReviewPayload;
}) {
  const initialItem = initial.items[0];
  const [data, setData] = useState(initial);
  const activeIndexRef = useRef(0);
  const preservedNoteRef = useRef<string | null>(null);
  const previewRecordingRef = useRef<Set<string>>(new Set());
  const [collection, setCollection] =
    useState<ReviewCollection>("review_first");
  const [batch, setBatch] = useState<ReviewBatch>(
    initial.batchKey === "festival-uat-assets-v1" ? "uat" : "batch1"
  );
  const [festival, setFestival] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [appearance, setAppearance] =
    useState<PreviewAppearance>("light");
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("context");
  const [note, setNote] = useState(initialItem?.review_note || "");
  const [axoChecklist, setAxoChecklist] = useState<
    Record<string, AxoCheckState>
  >(initialItem?.founder_review_metadata?.axoChecklist || {});
  const [universalChecklist, setUniversalChecklist] = useState<
    FestivalReviewChecklist
  >(initialItem?.founder_review_metadata?.universalChecklist || {});
  const [specificChecklist, setSpecificChecklist] = useState<
    FestivalReviewChecklist
  >(initialItem?.founder_review_metadata?.specificChecklist || {});
  const [scores, setScores] = useState<FestivalReviewScores>(
    initialItem?.founder_review_metadata?.scores || {}
  );
  const [interactionResult, setInteractionResult] = useState<
    FestivalReviewInteractionResult | ""
  >(initialItem?.founder_review_metadata?.interactionResult || "");
  const [culturalAcknowledged, setCulturalAcknowledged] = useState(
    initialItem?.founder_review_metadata?.culturalAttentionAcknowledged === true
  );
  const [confirmAction, setConfirmAction] = useState<ReviewAction | null>(null);
  const [advanceAfterDecision, setAdvanceAfterDecision] = useState(false);
  const [staleReview, setStaleReview] = useState(false);
  const [reviewedInContext, setReviewedInContext] = useState<Set<string>>(
    () => new Set(initial.items.filter((item) => item.reviewed_in_context).map((item) => item.id))
  );
  const [previewCoverage, setPreviewCoverage] = useState<Record<string, string[]>>(
    () => Object.fromEntries(
      initial.items.map((item) => [item.id, item.review_context_coverage || []])
    )
  );
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(
    () => new Set()
  );
  const [reviewInputs, setReviewInputs] = useState<Record<string, FounderReviewMetadata>>({});
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [versionConflict, setVersionConflict] =
    useState<VersionConflict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeItem = data.items[activeIndex] || null;
  const pages = Math.max(1, Math.ceil(data.filteredCount / data.pageSize));
  const canDecideActive = Boolean(
    activeItem &&
      (activeItem.is_representative || data.qualityGate.canReviewRemaining)
  );
  const supportedRegions = activeItem?.metadata_json?.supportedRegions || [];
  const specificChecks = activeItem
    ? festivalReviewSpecificChecks(activeItem.category, supportedRegions)
    : [];
  const universalFailures = festivalReviewChecklistFailures(
    FESTIVAL_REVIEW_UNIVERSAL_CHECKS,
    universalChecklist
  );
  const categoryChecklist = activeItem?.category === "axo"
    ? axoChecklist
    : specificChecklist;
  const specificFailures = festivalReviewChecklistFailures(
    specificChecks,
    categoryChecklist
  );
  const totalScore = festivalReviewScore(scores);
  const scoreComplete = festivalReviewScoreComplete(scores);
  const missingContexts = activeItem
    ? festivalReviewMissingContexts(previewCoverage[activeItem.id] || [])
    : [...FESTIVAL_REVIEW_CONTEXTS];
  const interactionBlocked = activeItem?.category === "axo" &&
    (!interactionResult || ["floating_incorrect", "needs_improvement"].includes(interactionResult));
  const approvalRequirement = !activeItem
    ? "Choose an asset"
    : !canDecideActive
      ? "Complete the representative quality gate"
      : missingContexts.length > 0
        ? `Preview required: ${missingContexts.join(", ")}`
      : activeItem.cultural_attention_required && !culturalAcknowledged
        ? "Confirm cultural review"
        : universalFailures.issues.length > 0 || specificFailures.issues.length > 0 || interactionBlocked
          ? note.trim()
            ? `Approval blocked: ${[
                ...universalFailures.issues,
                ...specificFailures.issues
              ].map(([, label]) => label).join(", ") || "Prop interaction needs correction"}. Use Needs Improvement.`
            : "Add an improvement note for the failed mandatory gate"
          : universalFailures.incomplete.length > 0
            ? `Complete mandatory gates: ${universalFailures.incomplete.map(([, label]) => label).join(", ")}`
            : specificFailures.incomplete.length > 0
              ? `Complete ${humanise(activeItem.category)} gates: ${specificFailures.incomplete.map(([, label]) => label).join(", ")}`
              : !scoreComplete
                ? "Complete every Founder quality score"
                : totalScore < 85
                  ? `Score ${totalScore}/100; approval requires 85/100`
                  : "Ready to Approve";
  const readyToApprove = approvalRequirement === "Ready to Approve";

  const query = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        pageSize: "30",
        collection,
        batch,
        refresh: String(refresh),
        ...(festival ? { festival } : {}),
        ...(category ? { category } : {}),
        ...(state ? { state } : {})
      }).toString(),
    [page, refresh, collection, batch, festival, category, state]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/website-experience/festival-review?${query}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.ok) {
          throw new Error(
            payload?.error?.message || "Review queue failed to load."
          );
        }
        const nextIndex = Math.min(
          activeIndexRef.current,
          Math.max(0, payload.data.items.length - 1)
        );
        const nextItem = payload.data.items[nextIndex] || null;
        setData(payload.data);
        setActiveIndex(nextIndex);
        activeIndexRef.current = nextIndex;
        setNote(preservedNoteRef.current ?? nextItem?.review_note ?? "");
        preservedNoteRef.current = null;
        setAxoChecklist(nextItem?.founder_review_metadata?.axoChecklist || {});
        setUniversalChecklist(
          nextItem?.founder_review_metadata?.universalChecklist || {}
        );
        setSpecificChecklist(
          nextItem?.founder_review_metadata?.specificChecklist || {}
        );
        setScores(nextItem?.founder_review_metadata?.scores || {});
        setInteractionResult(
          nextItem?.founder_review_metadata?.interactionResult || ""
        );
        setCulturalAcknowledged(
          nextItem?.founder_review_metadata?.culturalAttentionAcknowledged === true
        );
        setReviewedInContext((current) => new Set([
          ...current,
          ...payload.data.items
            .filter((item: FestivalFounderReviewItem) => item.reviewed_in_context)
            .map((item: FestivalFounderReviewItem) => item.id)
        ]));
        setPreviewCoverage((current) => ({
          ...current,
          ...Object.fromEntries(
            payload.data.items.map((item: FestivalFounderReviewItem) => [
              item.id,
              item.review_context_coverage || []
            ])
          )
        }));
        setStaleReview(false);
        setPreviewMode("context");
      })
      .catch((issue) => {
        if (issue.name !== "AbortError") setError(issue.message);
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (
      !activeItem ||
      previewMode !== "context" ||
      previewRecordingRef.current.has(
        `${activeItem.id}:${festivalReviewContextKey(viewport, appearance)}`
      ) ||
      (previewCoverage[activeItem.id] || []).includes(
        festivalReviewContextKey(viewport, appearance)
      )
    ) {
      return;
    }
    const itemId = activeItem.id;
    const previewKey = `${itemId}:${festivalReviewContextKey(viewport, appearance)}`;
    previewRecordingRef.current.add(previewKey);
    void fetch("/api/admin/website-experience/festival-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "preview_opened",
        itemId,
        expectedReviewVersion: activeItem.updated_at,
        viewport,
        appearance
      })
    }).then(async (response) => {
      previewRecordingRef.current.delete(previewKey);
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        const contexts = payload?.data?.contexts || [];
        setPreviewCoverage((current) => ({ ...current, [itemId]: contexts }));
        if (payload?.data?.reviewedInContext) {
          setReviewedInContext((current) => new Set(current).add(itemId));
        }
        return;
      }
      const payload = await response.json().catch(() => null);
      const referenceId = response.headers.get("x-correlation-id");
      setError(
        `${payload?.error?.message || "The real-context preview could not be recorded."}${referenceId ? ` Reference: ${referenceId}` : ""}`
      );
    }).catch(() => {
      previewRecordingRef.current.delete(previewKey);
      setError("The real-context preview could not be recorded. Retry the preview.");
    });
  }, [activeItem, appearance, previewCoverage, previewMode, viewport]);

  function hydrateDraft(item: FestivalFounderReviewItem | null) {
    const saved = item ? reviewInputs[item.id] : null;
    setNote(item?.review_note || "");
    setAxoChecklist(
      saved?.axoChecklist || item?.founder_review_metadata?.axoChecklist || {}
    );
    setUniversalChecklist(
      saved?.universalChecklist ||
        item?.founder_review_metadata?.universalChecklist ||
        {}
    );
    setSpecificChecklist(
      saved?.specificChecklist ||
        item?.founder_review_metadata?.specificChecklist ||
        {}
    );
    setScores(saved?.scores || item?.founder_review_metadata?.scores || {});
    setInteractionResult(
      saved?.interactionResult ||
        item?.founder_review_metadata?.interactionResult ||
        ""
    );
    setCulturalAcknowledged(
      saved?.culturalAttentionAcknowledged === true ||
        item?.founder_review_metadata?.culturalAttentionAcknowledged === true
    );
    setPreviewMode("context");
    setError("");
    setNotice("");
  }

  function selectItem(index: number) {
    const nextIndex = Math.min(
      Math.max(0, index),
      Math.max(0, data.items.length - 1)
    );
    setActiveIndex(nextIndex);
    activeIndexRef.current = nextIndex;
    hydrateDraft(data.items[nextIndex] || null);
  }

  function changeCollection(next: ReviewCollection) {
    if (next === "remaining" && !data.qualityGate.canReviewRemaining) return;
    setCollection(next);
    setPage(1);
    setActiveIndex(0);
    activeIndexRef.current = 0;
  }

  function move(direction: -1 | 1) {
    const next = activeIndex + direction;
    if (next < 0 || next >= data.items.length) return;
    selectItem(next);
  }

  function requestDecision(action: ReviewAction, moveNext = false) {
    if (!activeItem || busy || activeItem.review_state === "approved") return;
    setError("");
    setNotice("");
    setAdvanceAfterDecision(moveNext);
    if (!canDecideActive) {
      setError(
        "Complete the representative 30 with at least a 70% approval rate before reviewing the remaining assets."
      );
      return;
    }
    if (action === "approve" && !readyToApprove) {
      const hasMandatoryIssue =
        universalFailures.issues.length > 0 ||
        specificFailures.issues.length > 0 ||
        interactionBlocked;
      if (hasMandatoryIssue && note.trim()) {
        setConfirmAction("request_improvement");
        return;
      }
      setError(approvalRequirement);
      return;
    }
    if (
      action === "approve" &&
      activeItem.cultural_attention_required &&
      !culturalAcknowledged
    ) {
      setError(
        "Acknowledge the cultural review flags before approving this exact version."
      );
      return;
    }
    if (
      (action === "reject" || action === "request_improvement") &&
      !note.trim()
    ) {
      setError("Add a review note for this decision.");
      return;
    }
    setConfirmAction(action);
  }

  async function submitDecision() {
    if (!activeItem || !confirmAction) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/festival-review",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            itemId: activeItem.id,
            action: confirmAction,
            note,
            expectedReviewVersion: activeItem.updated_at,
            reviewMetadata: {
              collection,
              culturalAttentionAcknowledged: culturalAcknowledged,
              universalChecklist,
              specificChecklist,
              scores,
              ...(interactionResult ? { interactionResult } : {}),
              ...(activeItem.category === "axo" ? { axoChecklist } : {})
            }
          })
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        if (payload?.error?.code === "VERSION_CONFLICT" && payload.conflict) {
          setVersionConflict(payload.conflict as VersionConflict);
          setConfirmAction(null);
          return;
        }
        const referenceId = response.headers.get("x-correlation-id");
        throw new Error(`${payload?.error?.message || "Review decision failed."}${referenceId ? ` Reference: ${referenceId}` : ""}`);
      }
      const completedName = activeItem.display_name;
      const completedAction = confirmAction;
      setConfirmAction(null);
      setNotice(
        `${completedName}: ${decisionCopy[completedAction].label}. ${payload.data?.versionAssetId ? `Exact version ${payload.data.versionAssetId.slice(0, 8)} promoted. ` : ""}The public festival state was not changed.`
      );
      setSelectedApprovals((current) => {
        const next = new Set(current);
        next.delete(activeItem.id);
        return next;
      });
      if (advanceAfterDecision) {
        selectItem(
          Math.min(activeIndex + 1, Math.max(0, data.items.length - 1))
        );
      }
      setRefresh((current) => current + 1);
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Review decision failed.";
      setError(message);
      if (/changed in another session|updated; review the current version/i.test(message)) {
        setStaleReview(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function refreshStaleReview() {
    preservedNoteRef.current = note;
    setStaleReview(false);
    setError("");
    setRefresh((current) => current + 1);
  }

  function toggleCurrentBatchSelection() {
    if (!activeItem) return;
    if (!reviewedInContext.has(activeItem.id)) {
      setError("Open this asset in real-context preview before selecting it.");
      return;
    }
    if (!readyToApprove) {
      setError(approvalRequirement);
      return;
    }
    setReviewInputs((current) => ({
      ...current,
      [activeItem.id]: {
        collection,
        culturalAttentionAcknowledged: culturalAcknowledged,
        universalChecklist,
        specificChecklist,
        scores,
        ...(interactionResult ? { interactionResult } : {}),
        ...(activeItem.category === "axo" ? { axoChecklist } : {})
      }
    }));
    setSelectedApprovals((current) => {
      const next = new Set(current);
      if (next.has(activeItem.id)) next.delete(activeItem.id);
      else next.add(activeItem.id);
      return next;
    });
  }

  async function submitSelectedApprovals() {
    const selectedItems = data.items.filter((item) => selectedApprovals.has(item.id));
    if (selectedItems.length !== selectedApprovals.size) {
      setError("Keep all selected assets on the current review page, then retry.");
      setBatchConfirmOpen(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/festival-review",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "approve_selected",
            items: selectedItems.map((item) => ({
              itemId: item.id,
              expectedReviewVersion: item.updated_at,
              reviewMetadata: reviewInputs[item.id] || item.founder_review_metadata || {}
            }))
          })
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const referenceId = response.headers.get("x-correlation-id");
        throw new Error(`${payload?.error?.message || "Selected approvals could not be saved."}${referenceId ? ` Reference: ${referenceId}` : ""}`);
      }
      const firstConflict = payload.data.results?.find(
        (result: { outcome?: string }) => result.outcome === "needs_resolution"
      )?.conflict as VersionConflict | undefined;
      if (firstConflict) setVersionConflict(firstConflict);
      setNotice(
        `Batch complete. Approved: ${payload.data.approved}. Already Approved: ${payload.data.alreadyApproved}. Needs Resolution: ${payload.data.needsResolution}. Failed: ${payload.data.failed}. Public activation remains off.`
      );
      setSelectedApprovals(new Set(
        (payload.data.results || [])
          .filter((result: { outcome?: string }) => result.outcome === "needs_resolution")
          .map((result: { itemId: string }) => result.itemId)
      ));
      setBatchConfirmOpen(false);
      setRefresh((current) => current + 1);
    } catch (issue) {
      const message = issue instanceof Error
        ? issue.message
        : "Selected approvals could not be saved.";
      setError(message);
      if (/changed in another session|updated; review the current version/i.test(message)) {
        setStaleReview(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function resolveVersionConflict(
    resolution: "create_next_version" | "keep_existing" | "request_improvement"
  ) {
    if (!versionConflict) return;
    const conflictItem = data.items.find(
      (item) => item.id === versionConflict.reviewItemId
    );
    if (!conflictItem) {
      setError("Open the conflicted review item before resolving it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/festival-review",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            itemId: versionConflict.reviewItemId,
            action: "resolve_version_conflict",
            resolution,
            note,
            expectedReviewVersion: conflictItem.updated_at,
            reviewMetadata: {
              collection,
              culturalAttentionAcknowledged: culturalAcknowledged,
              universalChecklist,
              specificChecklist,
              scores,
              ...(interactionResult ? { interactionResult } : {}),
              ...(conflictItem.category === "axo" ? { axoChecklist } : {})
            }
          })
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const referenceId = response.headers.get("x-correlation-id");
        throw new Error(
          `${payload?.error?.message || "Conflict resolution failed."}${
            referenceId ? ` Reference: ${referenceId}` : ""
          }`
        );
      }
      setNotice(`${payload.data.message} Public activation remains off.`);
      setVersionConflict(null);
      setSelectedApprovals((current) => {
        const next = new Set(current);
        next.delete(conflictItem.id);
        return next;
      });
      setRefresh((current) => current + 1);
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Conflict resolution failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function runIntegrityAudit() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/festival-review",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "audit_integrity" })
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const referenceId = response.headers.get("x-correlation-id");
        throw new Error(
          `${payload?.error?.message || "The governed asset audit could not complete."}${
            referenceId ? ` Reference: ${referenceId}` : ""
          }`
        );
      }
      const result = payload.data;
      setNotice(
        `Integrity audit complete. Healthy: ${result.healthy}/${result.audited}. ` +
        `Checksums repaired: ${result.repairedChecksums}. Thumbnails repaired: ${result.repairedThumbnails}. ` +
        `Hidden from selectors: ${result.hiddenFromSelectors}. Public activation remains off.`
      );
      setRefresh((current) => current + 1);
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "The governed asset audit could not complete."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (
      target?.matches("input, textarea, select, button, a") ||
      busy ||
      confirmAction
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "arrowleft") {
      event.preventDefault();
      move(-1);
    } else if (key === "arrowright") {
      event.preventDefault();
      move(1);
    } else if (key === "a") {
      event.preventDefault();
      requestDecision("approve");
    } else if (key === "i") {
      event.preventDefault();
      requestDecision("request_improvement");
    } else if (key === "r") {
      event.preventDefault();
      requestDecision("reject");
    }
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <section className="rounded-lg border border-wxBorder bg-wxSurface p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-wxIndigo900">
              Governed asset integrity
            </h2>
            <p className="mt-1 text-xs text-wxIndigo500">
              {data.integrity.healthy} healthy, {data.integrity.unchecked} unchecked,
              {" "}{data.integrity.missingSource} missing source,
              {" "}{data.integrity.checksumMismatch + data.integrity.invalidMetadata} require repair.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runIntegrityAudit()}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 text-sm font-semibold text-wxIndigo800 disabled:opacity-45"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Verify Approved Assets
          </button>
        </div>
      </section>
      <BatchSummary data={data} />
      {batch === "batch1" ? (
        <QualityGate data={data} />
      ) : (
        <section className="rounded-lg border border-wxViolet700/30 bg-violet-50 p-4 text-sm text-wxIndigo700">
          UAT assets are reviewed independently from Batch 1. Approval governs
          only the exact uploaded version and does not activate a festival.
        </section>
      )}

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-4 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-wxBorder pb-4">
          <CollectionButton
            active={batch === "batch1"}
            onClick={() => {
              setBatch("batch1");
              setCollection("review_first");
              setPage(1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
          >
            Batch 1 - 120 Assets
          </CollectionButton>
          <CollectionButton
            active={batch === "uat"}
            onClick={() => {
              setBatch("uat");
              setCollection("all");
              setPage(1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
          >
            Festival Studio UAT Assets
          </CollectionButton>
          <p className="ml-auto text-xs font-semibold text-wxIndigo600">
            {data.batchName || "Founder Visual Review"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {batch === "batch1" ? <><CollectionButton
            active={collection === "review_first"}
            onClick={() => changeCollection("review_first")}
          >
            Review First 30
          </CollectionButton>
          <CollectionButton
            active={collection === "remaining"}
            disabled={!data.qualityGate.canReviewRemaining}
            onClick={() => changeCollection("remaining")}
          >
            Remaining 90
          </CollectionButton>
          <CollectionButton
            active={collection === "all"}
            onClick={() => changeCollection("all")}
          >
            All 120
          </CollectionButton>
          </> : <AdminStatusBadge tone="warning">Exact UAT versions - private only</AdminStatusBadge>}
          <p className="ml-auto text-xs text-wxIndigo500">
            Private Founder review only. Nothing here activates a festival.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-wxBorder pt-4">
          <Filter
            label="Festival"
            value={festival}
            options={festivals}
            onChange={(value) => {
              setFestival(value);
              setPage(1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
          />
          <Filter
            label="Category"
            value={category}
            options={categories}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
          />
          <Filter
            label="Review status"
            value={state}
            options={states}
            onChange={(value) => {
              setState(value);
              setPage(1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
          />
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <span className="min-w-0 flex-1">{error}</span>
          {staleReview ? (
            <button
              type="button"
              onClick={refreshStaleReview}
              className="min-h-9 rounded-md border border-red-300 bg-white px-3 text-xs font-semibold text-red-800"
            >
              Refresh current review
            </button>
          ) : null}
        </div>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      ) : null}

      {activeItem ? (
        <>
          <ReviewQueueStrip
            items={data.items}
            activeIndex={activeIndex}
            onSelect={selectItem}
          />

          {selectedApprovals.size > 0 ? (
            <section className="sticky top-3 z-40 flex flex-wrap items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 shadow-lg">
              <p className="min-w-0 flex-1 text-sm font-semibold text-emerald-950">
                {selectedApprovals.size} reviewed exact version{selectedApprovals.size === 1 ? "" : "s"} selected
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelectedApprovals(new Set())}
                className="min-h-9 rounded-md border border-emerald-300 px-3 text-xs font-semibold text-emerald-900"
              >
                Clear selection
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setBatchConfirmOpen(true)}
                className="min-h-9 rounded-md bg-emerald-700 px-4 text-xs font-semibold text-white"
              >
                Approve Selected Reviewed Assets
              </button>
            </section>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.72fr)]">
            <div className="min-w-0 overflow-hidden rounded-lg border border-wxBorder bg-wxSurface shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-wxBorder p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge tone={statusTone(activeItem.review_state)}>
                      {humanise(activeItem.review_state)}
                    </AdminStatusBadge>
                    <span className="text-xs font-semibold text-wxIndigo500">
                      {activeIndex + 1} of {data.items.length}
                    </span>
                    {activeItem.cultural_attention_required ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        <ShieldAlert className="h-3.5 w-3.5" /> Founder attention
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-wxIndigo900">
                    {activeItem.display_name}
                  </h2>
                  <p className="mt-1 text-sm text-wxIndigo500">
                    {activeItem.festival_name} / {humanise(activeItem.category)} /{" "}
                    {humanise(activeItem.subcategory)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    disabled={activeIndex === 0}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder text-wxIndigo700 disabled:opacity-40"
                    aria-label="Previous asset"
                    title="Previous asset (Left arrow)"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    disabled={activeIndex >= data.items.length - 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder text-wxIndigo700 disabled:opacity-40"
                    aria-label="Next asset"
                    title="Next asset (Right arrow)"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-wxBorder bg-wxSurfaceSoft p-3">
                <PreviewButton
                  active={previewMode === "isolated"}
                  onClick={() => setPreviewMode("isolated")}
                  icon={<Eye className="h-4 w-4" />}
                >
                  Transparent asset
                </PreviewButton>
                <PreviewButton
                  active={previewMode === "context"}
                  onClick={() => setPreviewMode("context")}
                  icon={<LayoutTemplate className="h-4 w-4" />}
                >
                  {contextLabel(activeItem.category)}
                </PreviewButton>
                <div className="ml-auto flex gap-1 rounded-md border border-wxBorder bg-wxSurface p-1">
                  <IconToggle
                    active={appearance === "light"}
                    label="Light mode"
                    onClick={() => setAppearance("light")}
                  >
                    <Sun className="h-4 w-4" />
                  </IconToggle>
                  <IconToggle
                    active={appearance === "dark"}
                    label="Dark mode"
                    onClick={() => setAppearance("dark")}
                  >
                    <Moon className="h-4 w-4" />
                  </IconToggle>
                  <IconToggle
                    active={viewport === "desktop"}
                    label="Desktop preview"
                    onClick={() => setViewport("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </IconToggle>
                  <IconToggle
                    active={viewport === "tablet"}
                    label="Tablet preview"
                    onClick={() => setViewport("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                  </IconToggle>
                  <IconToggle
                    active={viewport === "mobile"}
                    label="Mobile preview"
                    onClick={() => setViewport("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </IconToggle>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <FestivalSceneReviewRenderer
                  item={activeItem}
                  mode={previewMode}
                  appearance={appearance}
                  viewport={viewport}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {FESTIVAL_REVIEW_CONTEXTS.map((context) => {
                    const complete = (previewCoverage[activeItem.id] || []).includes(context);
                    return (
                      <span
                        key={context}
                        className={`inline-flex min-h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold ${
                          complete
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-amber-300 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {complete ? <Check className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {humanise(context)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 border-t border-wxBorder bg-wxSurfaceSoft p-4 sm:grid-cols-2 lg:grid-cols-5">
                <Detail label="Exact version" value={`v${activeItem.metadata_json?.version || 1}`} />
                <Detail label="Checksum" value={activeItem.checksum_sha256.slice(0, 16)} />
                <Detail label="Dimensions" value={`${activeItem.width} x ${activeItem.height}`} />
                <Detail label="Scene region" value={(activeItem.metadata_json?.supportedRegions || []).map(humanise).join(", ") || humanise(activeItem.category)} />
                <Detail label="AXO anchor" value={activeItem.metadata_json?.axoAnchor ? humanise(activeItem.metadata_json.axoAnchor) : "Not applicable"} />
              </div>
            </div>

            <aside className="space-y-4">
              <MandatoryChecklist
                title="Universal quality gates"
                description="Every mandatory quality, provenance, placement and safety check must pass."
                checks={FESTIVAL_REVIEW_UNIVERSAL_CHECKS}
                values={universalChecklist}
                onConfirmAll={(checked) =>
                  setUniversalChecklist(
                    checked
                      ? Object.fromEntries(
                          FESTIVAL_REVIEW_UNIVERSAL_CHECKS.map(([key]) => [key, "pass"])
                        )
                      : {}
                  )
                }
                onChange={(key, value) =>
                  setUniversalChecklist((current) => ({ ...current, [key]: value }))
                }
              />

              {activeItem.cultural_attention_required ? (
                <CulturalReview
                  flags={activeItem.cultural_flags}
                  checked={culturalAcknowledged}
                  onChange={setCulturalAcknowledged}
                />
              ) : null}

              {activeItem.category === "axo" ? (
                <AxoReview
                  values={axoChecklist}
                  interactionResult={interactionResult}
                  onInteractionResult={(value) => {
                    setInteractionResult(value);
                    if (
                      ["floating_incorrect", "needs_improvement"].includes(value) &&
                      !note.trim()
                    ) {
                      setNote(
                        "Attach the prop to the declared AXO anchor and correct scale, rotation and layering."
                      );
                    }
                  }}
                  onConfirmAll={(checked) =>
                    setAxoChecklist(
                      checked
                        ? (Object.fromEntries(
                            axoChecks.map(([key]) => [key, "pass"])
                          ) as Record<string, AxoCheckState>)
                        : {}
                    )
                  }
                  onChange={(key, value) =>
                    setAxoChecklist((current) => {
                      if (value === "issue" && !note.trim()) {
                        setNote(
                          "Attach the prop to the declared AXO anchor and correct scale, rotation and layering."
                        );
                      }
                      return { ...current, [key]: value };
                    })
                  }
                />
              ) : specificChecks.length > 0 ? (
                <MandatoryChecklist
                  title={`${humanise(activeItem.category)} quality gates`}
                  description="These checks confirm that the asset works in its declared website role."
                  checks={specificChecks}
                  values={specificChecklist}
                  onConfirmAll={(checked) =>
                    setSpecificChecklist(
                      checked
                        ? Object.fromEntries(
                            specificChecks.map(([key]) => [key, "pass"])
                          )
                        : {}
                    )
                  }
                  onChange={(key, value) =>
                    setSpecificChecklist((current) => ({ ...current, [key]: value }))
                  }
                />
              ) : null}

              <FounderScoreCard scores={scores} onChange={setScores} />

              <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
                <h3 className="font-semibold text-wxIndigo900">
                  Founder decision
                </h3>
                <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                  Approval promotes this exact checksum into the governed library.
                  It never assigns or activates it publicly.
                </p>
                <label className="mt-4 block text-xs font-semibold text-wxIndigo700">
                  Optional note for approval; required for improvement or rejection
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 500))}
                    rows={4}
                    className="mt-2 w-full resize-y rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
                    placeholder="Record the visual issue or approval context."
                  />
                </label>

                <div
                  className={`mt-3 rounded-md border p-3 text-xs font-semibold ${
                    readyToApprove
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {approvalRequirement}
                </div>

                {activeItem.review_state !== "approved" ? (
                  <label className="mt-3 flex items-start gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-xs font-semibold text-wxIndigo700">
                    <input
                      type="checkbox"
                      checked={selectedApprovals.has(activeItem.id)}
                      disabled={!reviewedInContext.has(activeItem.id) || !readyToApprove}
                      onChange={toggleCurrentBatchSelection}
                      className="mt-0.5"
                    />
                    Select this real-context reviewed version for batch approval
                  </label>
                ) : null}

                {!canDecideActive ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    This item remains view-only until the representative 30 passes
                    the 70% quality gate.
                  </p>
                ) : null}

                {activeItem.review_state === "approved" ? (
                  <p className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    Exact reviewed version approved for the governed Asset Library.
                    Public activation remains off.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!readyToApprove || busy}
                      onClick={() => requestDecision("approve", true)}
                      className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-45"
                      title="Approve exact version and open the next pending asset"
                    >
                      <Check className="h-4 w-4" /> Approve &amp; Next
                    </button>
                    <button
                      type="button"
                      disabled={!readyToApprove || busy}
                      onClick={() => requestDecision("approve")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-emerald-600 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900 disabled:opacity-45"
                      title="Approve (A)"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={!canDecideActive || busy}
                      onClick={() => requestDecision("request_improvement")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-500 bg-amber-50 px-3 text-sm font-semibold text-amber-900 disabled:opacity-45"
                      title="Needs Improvement (I)"
                    >
                      <AlertTriangle className="h-4 w-4" /> Improve
                    </button>
                    <button
                      type="button"
                      disabled={!canDecideActive || busy}
                      onClick={() => requestDecision("reject")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-400 px-3 text-sm font-semibold text-red-700 disabled:opacity-45"
                      title="Reject (R)"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={!canDecideActive || busy}
                      onClick={() => requestDecision("hide")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700 disabled:opacity-45"
                    >
                      <EyeOff className="h-4 w-4" /> Hide
                    </button>
                  </div>
                )}
                <p className="mt-3 text-center text-[11px] text-wxIndigo500">
                  Keyboard: A approve / I improve / R reject / ← → navigate
                </p>
              </section>
            </aside>
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-wxBorder bg-wxSurface p-8 text-center">
          {collection === "remaining" && !data.qualityGate.canReviewRemaining
            ? "The remaining 90 stay locked until the representative quality gate passes."
            : "No assets match these filters."}
        </section>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage((current) => current - 1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
            className="rounded-md border border-wxBorder p-2 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-wxIndigo700">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => {
              setPage((current) => current + 1);
              setActiveIndex(0);
              activeIndexRef.current = 0;
            }}
            className="rounded-md border border-wxBorder p-2 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <ReviewBreakdowns data={data} />

      {confirmAction && activeItem ? (
        <DecisionDialog
          item={activeItem}
          action={confirmAction}
          busy={busy}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => void submitDecision()}
        />
      ) : null}
      {versionConflict ? (
        <VersionConflictDialog
          conflict={versionConflict}
          busy={busy}
          onCancel={() => setVersionConflict(null)}
          onResolve={(resolution) => void resolveVersionConflict(resolution)}
        />
      ) : null}
      {batchConfirmOpen ? (
        <BatchApprovalDialog
          items={data.items.filter((item) => selectedApprovals.has(item.id))}
          busy={busy}
          onCancel={() => setBatchConfirmOpen(false)}
          onConfirm={() => void submitSelectedApprovals()}
        />
      ) : null}
    </div>
  );
}

function BatchSummary({ data }: { data: FestivalFounderReviewPayload }) {
  const summary = [
    ["Pending", data.summary.review_required || 0],
    ["Approved", data.summary.approved || 0],
    ["Needs Improvement", data.summary.improvement_requested || 0],
    ["Rejected", data.summary.rejected || 0],
    ["Hidden", data.summary.hidden || 0]
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {summary.map(([label, value]) => (
        <div
          key={String(label)}
          className="rounded-md border border-wxBorder bg-wxSurface p-4"
        >
          <p className="text-xs font-semibold uppercase text-wxIndigo500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-wxIndigo900">
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}

function QualityGate({ data }: { data: FestivalFounderReviewPayload }) {
  const gate = data.qualityGate;
  const stateCopy =
    gate.state === "passed"
      ? "Quality gate passed. The remaining 90 are available in the same private workflow."
      : gate.state === "stopped"
        ? "Quality gate stopped. Fewer than 70% of the representative sample were approved; the remaining 90 stay locked."
        : `Review all ${gate.sampleSize} representative assets before the full-batch decision.`;
  return (
    <section
      className={`rounded-lg border p-5 ${
        gate.state === "passed"
          ? "border-emerald-200 bg-emerald-50"
          : gate.state === "stopped"
            ? "border-red-200 bg-red-50"
            : "border-wxBorder bg-wxSurface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
            Representative quality gate
          </p>
          <h2 className="mt-1 text-lg font-semibold text-wxIndigo900">
            {gate.reviewed} of {gate.sampleSize} Founder decisions recorded
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-wxIndigo600">
            {stateCopy}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Rate label="Approved" value={gate.approvalRate} />
          <Rate label="Improve" value={gate.improvementRate} />
          <Rate label="Rejected" value={gate.rejectionRate} />
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-wxBorder">
        <div
          className="h-full rounded-full bg-wxViolet700 transition-all"
          style={{ width: `${Math.min(100, (gate.reviewed / Math.max(1, gate.sampleSize)) * 100)}%` }}
        />
      </div>
    </section>
  );
}

function Rate({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-semibold text-wxIndigo900">{value}%</p>
      <p className="text-[11px] font-semibold uppercase text-wxIndigo500">
        {label}
      </p>
    </div>
  );
}

function ReviewQueueStrip({
  items,
  activeIndex,
  onSelect
}: {
  items: FestivalFounderReviewItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-3 shadow-soft">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(index)}
            className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-wxSurfaceSoft transition ${
              index === activeIndex
                ? "border-wxViolet700 ring-2 ring-wxViolet700/20"
                : "border-transparent hover:border-wxBorderStrong"
            }`}
            aria-label={`Open ${item.display_name}`}
            aria-current={index === activeIndex ? "true" : undefined}
          >
            <Image
              src={`/api/admin/website-experience/festival-review?preview=${item.id}&kind=thumbnail`}
              alt=""
              fill
              unoptimized
              loading="lazy"
              className="object-contain p-1"
            />
            <span
              className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white ${
                item.review_state === "approved"
                  ? "bg-emerald-500"
                  : item.review_state === "rejected"
                    ? "bg-red-500"
                    : item.review_state === "improvement_requested"
                      ? "bg-amber-500"
                      : item.review_state === "hidden"
                        ? "bg-slate-500"
                        : "bg-violet-500"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function FestivalSceneReviewRenderer({
  item,
  mode,
  appearance,
  viewport
}: {
  item: FestivalFounderReviewItem;
  mode: PreviewMode;
  appearance: PreviewAppearance;
  viewport: PreviewViewport;
}) {
  const mobile = viewport === "mobile";
  const tablet = viewport === "tablet";
  const animated = item.category === "ambient" || item.category === "feature";
  const assetUrl = `/api/admin/website-experience/festival-review?preview=${item.id}&kind=source`;
  const checkerStyle = {
    backgroundColor: appearance === "dark" ? "#111735" : "#f7f7fb",
    backgroundImage:
      appearance === "dark"
        ? "linear-gradient(45deg,#171e43 25%,transparent 25%),linear-gradient(-45deg,#171e43 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#171e43 75%),linear-gradient(-45deg,transparent 75%,#171e43 75%)"
        : "linear-gradient(45deg,#e8e9f3 25%,transparent 25%),linear-gradient(-45deg,#e8e9f3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8e9f3 75%),linear-gradient(-45deg,transparent 75%,#e8e9f3 75%)",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
    backgroundSize: "24px 24px"
  };

  if (mode === "isolated") {
    return (
      <div
        className={`relative mx-auto overflow-hidden rounded-md border border-wxBorder ${
          mobile
            ? "aspect-[9/16] max-h-[680px]"
            : tablet
              ? "aspect-[4/3] max-w-4xl"
              : "aspect-[16/9] w-full"
        }`}
        style={checkerStyle}
      >
        <Image
          src={assetUrl}
          alt={`${item.display_name}, transparent asset`}
          fill
          unoptimized
          className={`object-contain p-[8%] ${animated ? "wx-review-asset-motion" : ""}`}
        />
        <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
          Transparent source / exact v{item.metadata_json?.version || 1}
        </span>
      </div>
    );
  }

  const dark = appearance === "dark";
  return (
    <div
      className={`relative mx-auto isolate overflow-hidden rounded-md border border-wxBorder ${
        mobile
          ? "aspect-[9/16] max-h-[680px]"
          : tablet
            ? "aspect-[4/3] max-w-4xl"
            : "aspect-[16/9] w-full"
      } ${dark ? "bg-[#090f2f] text-white" : "bg-[#f7f7fc] text-[#121b58]"}`}
      data-review-appearance={appearance}
      data-review-viewport={viewport}
      data-review-region={(item.metadata_json?.supportedRegions || [item.category])[0]}
    >
      <div
        className={`absolute inset-0 ${
          dark
            ? "bg-[radial-gradient(circle_at_75%_20%,rgba(125,91,255,.22),transparent_34%),linear-gradient(145deg,#090f2f,#171d47)]"
            : "bg-[radial-gradient(circle_at_75%_20%,rgba(218,63,142,.14),transparent_34%),linear-gradient(145deg,#fff,#f0edff)]"
        }`}
      />
      <div
        className={`absolute inset-x-0 top-0 z-30 flex items-center border-b px-[4%] ${
          mobile ? "h-[9%]" : "h-[10%]"
        } ${dark ? "border-white/10 bg-[#0e1538]/90" : "border-black/10 bg-white/90"}`}
      >
        <LogoWithTrademark
          className={mobile ? "w-20" : "w-28"}
          priority={false}
          sizes={mobile ? "80px" : "112px"}
        />
        {!mobile ? (
          <div className="ml-auto flex gap-4 text-[10px] font-semibold opacity-70">
            <span>Services</span>
            <span>Trust Centre</span>
            <span>Careers</span>
            <span>Contact</span>
          </div>
        ) : (
          <div className="ml-auto h-5 w-5 rounded border border-current opacity-50" />
        )}
      </div>

      <div className={`absolute inset-x-[7%] top-[22%] z-10 ${mobile ? "max-w-[75%]" : "max-w-[42%]"}`}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-500">
          WriteX Festival Preview
        </p>
        <div className={`${mobile ? "mt-2 h-3 w-4/5" : "mt-3 h-5 w-3/4"} rounded bg-current opacity-85`} />
        <div className={`${mobile ? "mt-2 h-2" : "mt-3 h-3"} w-full rounded bg-current opacity-20`} />
        <div className="mt-2 h-2 w-4/5 rounded bg-current opacity-20" />
        <div className={`${mobile ? "mt-3 h-6 w-20" : "mt-5 h-9 w-28"} rounded-md bg-violet-600`} />
      </div>

      {item.category === "header" ? (
        <div className="absolute inset-x-0 top-[7%] z-40 h-[25%]">
          <ReviewAssetImage item={item} className="object-contain object-top" />
        </div>
      ) : null}

      {item.category === "ground" ? (
        <div className="absolute inset-x-0 bottom-0 z-30 h-[37%]">
          <ReviewAssetImage item={item} className="object-contain object-bottom" />
        </div>
      ) : null}

      {item.category === "axo" ? (
        <AxoScene item={item} viewport={viewport} />
      ) : (
        <div className={`absolute z-10 ${mobile ? "bottom-[10%] right-[8%] h-[34%] w-[44%]" : "bottom-[8%] right-[11%] h-[58%] w-[26%]"}`}>
          <Image
            src="/images/mascots/writex-mascot-standing-wave.webp"
            alt="WriteX AXO mascot"
            fill
            sizes={mobile ? "44vw" : "26vw"}
            className="object-contain object-bottom"
          />
        </div>
      )}

      {item.category === "ambient" || item.category === "feature" ? (
        <div className={`absolute inset-0 z-20 ${animated ? "wx-review-asset-motion" : ""}`}>
          <ReviewAssetImage item={item} className="object-contain" />
        </div>
      ) : null}

      <div className={`absolute inset-x-0 bottom-0 z-20 border-t px-[5%] ${mobile ? "h-[8%]" : "h-[9%]"} ${dark ? "border-white/10 bg-[#0b1130]/90" : "border-black/10 bg-white/88"}`}>
        <div className="flex h-full items-center justify-between text-[9px] font-semibold opacity-65">
          <span>WriteX</span>
          <span>Kolkata, India</span>
        </div>
      </div>

      <span className="absolute bottom-[11%] left-[4%] z-50 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
        Scene Builder / {contextLabel(item.category)} / {humanise(viewport)} / {humanise(appearance)}
      </span>
      {animated ? (
        <span className="absolute right-[4%] top-[13%] z-50 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
          <Sparkles className="h-3 w-3" /> Animated preview
        </span>
      ) : null}
    </div>
  );
}

function ReviewAssetImage({
  item,
  className
}: {
  item: FestivalFounderReviewItem;
  className: string;
}) {
  return (
    <Image
      src={`/api/admin/website-experience/festival-review?preview=${item.id}&kind=source`}
      alt={item.display_name}
      fill
      unoptimized
      className={className}
    />
  );
}

function AxoScene({
  item,
  viewport
}: {
  item: FestivalFounderReviewItem;
  viewport: PreviewViewport;
}) {
  const anchor = item.metadata_json?.axoAnchor || "side";
  const placement = festivalAxoPlacement(
    item.metadata_json?.axoPlacement,
    anchor
  );
  const mobile = viewport === "mobile";
  const tablet = viewport === "tablet";
  const stageClass = mobile
    ? "bottom-[8%] right-[11%] h-[56%] w-[62%]"
    : tablet
      ? "bottom-[7%] right-[8%] h-[65%] w-[40%]"
      : "bottom-[7%] right-[10%] h-[67%] w-[34%]";
  return (
    <div className="absolute inset-0 z-20">
      <div className={`absolute ${stageClass}`}>
        <AxoComposite item={item} placement={placement} viewport={viewport} />
      </div>
      <div className="absolute left-[3%] top-[13%] z-40 w-[29%] min-w-28 overflow-hidden rounded-md border border-violet-300 bg-black/75 p-2 text-white shadow-lg">
        <p className="text-[9px] font-semibold uppercase">Hand / prop alignment</p>
        <div className="relative mt-1 aspect-square overflow-hidden rounded bg-white/10">
          <div
            className="absolute h-[220%] w-[220%]"
            style={{
              left: `${50 - placement.anchorPoint.x * 220}%`,
              top: `${50 - placement.anchorPoint.y * 220}%`
            }}
          >
            <AxoComposite item={item} placement={placement} viewport={viewport} />
          </div>
        </div>
      </div>
      <div className="absolute right-[3%] top-[13%] z-40 space-y-1 text-right">
        <span className="block rounded bg-violet-700 px-2 py-1 text-[9px] font-semibold text-white">
          AXO anchor: {humanise(placement.anchorType)}
        </span>
        <span className="block rounded bg-black/70 px-2 py-1 text-[9px] font-semibold text-white">
          Grip: {Math.round(placement.gripPoint.x * 100)}%, {Math.round(placement.gripPoint.y * 100)}%
        </span>
      </div>
    </div>
  );
}

function AxoComposite({
  item,
  placement,
  viewport
}: {
  item: FestivalFounderReviewItem;
  placement: FestivalAxoPlacement;
  viewport: PreviewViewport;
}) {
  const transform = placement.transforms[viewport];
  const fullBounds = placement.coordinateSpace === "axo_bounds";
  const propWidth = 46 * transform.scale;
  const propHeight = 30 * transform.scale;
  const left = placement.anchorPoint.x * 100 - placement.gripPoint.x * propWidth + transform.offsetXPercent;
  const top = placement.anchorPoint.y * 100 - placement.gripPoint.y * propHeight + transform.offsetYPercent;
  return (
    <div className="absolute inset-0" data-axo-coordinate-space={placement.coordinateSpace}>
      <div className="absolute bottom-0 left-1/2 h-full aspect-[752/1159] -translate-x-1/2">
        <Image
          src="/images/mascots/writex-mascot-standing-wave.webp"
          alt="WriteX AXO mascot"
          fill
          sizes="(max-width: 767px) 62vw, (max-width: 1199px) 40vw, 34vw"
          className="object-contain object-bottom"
        />
        <div
          className="absolute"
          style={fullBounds
            ? {
                inset: 0,
                transform: `translate(${transform.offsetXPercent}%, ${transform.offsetYPercent}%) scale(${transform.scale}) rotate(${transform.rotationDeg}deg)`,
                zIndex: transform.zIndex,
                transformOrigin: `${placement.anchorPoint.x * 100}% ${placement.anchorPoint.y * 100}%`
              }
            : {
                left: `${left}%`,
                top: `${top}%`,
                width: `${propWidth}%`,
                height: `${propHeight}%`,
                transform: `rotate(${transform.rotationDeg}deg)`,
                zIndex: transform.zIndex,
                transformOrigin: `${placement.gripPoint.x * 100}% ${placement.gripPoint.y * 100}%`
              }}
        >
          <ReviewAssetImage item={item} className="object-contain" />
        </div>
        <span
          className="absolute z-50 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow"
          style={{
            left: `${placement.anchorPoint.x * 100}%`,
            top: `${placement.anchorPoint.y * 100}%`
          }}
          title="AXO anchor"
        />
      </div>
    </div>
  );
}

function CulturalReview({
  flags,
  checked,
  onChange
}: {
  flags: string[];
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h3 className="flex items-center gap-2 font-semibold text-amber-950">
        <ShieldAlert className="h-5 w-5" /> Cultural review required
      </h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-amber-900">
        {flags.map((flag) => (
          <li key={flag} className="flex gap-2">
            <span aria-hidden="true">-</span>
            <span>{flag}</span>
          </li>
        ))}
      </ul>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-amber-300 bg-white/70 p-3 text-xs font-semibold text-amber-950">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5"
        />
        I reviewed the cultural, national or ceremonial details. This is not an
        automatic correctness certification.
      </label>
    </section>
  );
}

function MandatoryChecklist({
  title,
  description,
  checks,
  values,
  onConfirmAll,
  onChange
}: {
  title: string;
  description: string;
  checks: ReadonlyArray<readonly [string, string]>;
  values: FestivalReviewChecklist;
  onConfirmAll: (checked: boolean) => void;
  onChange: (key: string, value: AxoCheckState) => void;
}) {
  const issueCount = checks.filter(([key]) => values[key] === "issue").length;
  const allPassed = checks.every(([key]) => values[key] === "pass");
  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
      <h3 className="font-semibold text-wxIndigo900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-wxIndigo500">
        {description}
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
        <input
          type="checkbox"
          checked={allPassed}
          onChange={(event) => onConfirmAll(event.target.checked)}
          className="mt-0.5"
        />
        All checks pass
      </label>
      <details className="mt-3 rounded-md border border-wxBorder bg-wxSurfaceSoft">
        <summary className="cursor-pointer p-3 text-xs font-semibold text-wxIndigo700">
          Review Details
        </summary>
        <div className="space-y-2 border-t border-wxBorder p-3">
          {checks.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurface p-2.5"
            >
              <span className="text-xs font-semibold text-wxIndigo700">{label}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onChange(key, "pass")}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
                    values[key] === "pass"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-wxBorder text-wxIndigo500"
                  }`}
                  aria-label={`${label}: pass`}
                  title="Pass"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(key, "issue")}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
                    values[key] === "issue"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-wxBorder text-wxIndigo500"
                  }`}
                  aria-label={`${label}: failed`}
                  title="Failed"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </details>
      {issueCount > 0 ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          {issueCount} mandatory check{issueCount === 1 ? "" : "s"} failed. Approval is unavailable; add an improvement note and choose Needs Improvement.
        </p>
      ) : null}
    </section>
  );
}

function AxoReview({
  values,
  interactionResult,
  onInteractionResult,
  onConfirmAll,
  onChange
}: {
  values: Record<string, AxoCheckState>;
  interactionResult: FestivalReviewInteractionResult | "";
  onInteractionResult: (value: FestivalReviewInteractionResult) => void;
  onConfirmAll: (checked: boolean) => void;
  onChange: (key: string, value: AxoCheckState) => void;
}) {
  return (
    <div className="space-y-3">
      <MandatoryChecklist
        title="AXO placement and interaction"
        description="The prop must remain naturally attached to AXO across every viewport and appearance."
        checks={axoChecks}
        values={values}
        onConfirmAll={onConfirmAll}
        onChange={onChange}
      />
      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        <label className="block text-xs font-semibold text-wxIndigo700">
          Interaction Result
          <select
            value={interactionResult}
            onChange={(event) =>
              onInteractionResult(
                event.target.value as FestivalReviewInteractionResult
              )
            }
            className="mt-2 min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
          >
            <option value="">Select result</option>
            {FESTIVAL_REVIEW_INTERACTION_RESULTS.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </label>
        {interactionResult === "floating_incorrect" ||
        interactionResult === "needs_improvement" ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900">
            Approval is blocked until a corrected exact version is reviewed.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function FounderScoreCard({
  scores,
  onChange
}: {
  scores: FestivalReviewScores;
  onChange: (scores: FestivalReviewScores) => void;
}) {
  const total = festivalReviewScore(scores);
  const complete = festivalReviewScoreComplete(scores);
  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-wxIndigo900">Founder quality score</h3>
          <p className="mt-1 text-xs text-wxIndigo500">Approval requires 85/100.</p>
        </div>
        <span
          className={`rounded-md px-3 py-2 text-sm font-bold ${
            complete && total >= 85
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {total}/100
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {FESTIVAL_REVIEW_SCORE_DIMENSIONS.map(([key, label, maximum]) => (
          <label
            key={key}
            className="grid grid-cols-[1fr_70px] items-center gap-3 text-xs font-semibold text-wxIndigo700"
          >
            <span>{label} / {maximum}</span>
            <input
              type="number"
              min={0}
              max={maximum}
              step={1}
              value={scores[key] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                const next = { ...scores };
                if (!value) delete next[key];
                else next[key] = Math.min(maximum, Math.max(0, Number(value)));
                onChange(next);
              }}
              className="h-9 rounded-md border border-wxBorder bg-wxSurface px-2 text-right text-sm text-wxIndigo900"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function ReviewBreakdowns({ data }: { data: FestivalFounderReviewPayload }) {
  const festivalRows = data.breakdowns.filter(
    (row) => row.dimension === "festival"
  );
  const categoryRows = data.breakdowns.filter(
    (row) => row.dimension === "category"
  );
  return (
    <details className="rounded-lg border border-wxBorder bg-wxSurface shadow-soft">
      <summary className="cursor-pointer p-5 font-semibold text-wxIndigo900">
        Review summary by festival and category
      </summary>
      <div className="grid gap-6 border-t border-wxBorder p-5 xl:grid-cols-2">
        <BreakdownTable title="By festival" rows={festivalRows} />
        <BreakdownTable title="By category" rows={categoryRows} />
      </div>
      <div className="border-t border-wxBorder p-5">
        <h3 className="text-sm font-semibold text-wxIndigo900">
          Recurring visual-quality issues
        </h3>
        {data.recurringIssues.length ? (
          <ul className="mt-3 space-y-2 text-sm text-wxIndigo600">
            {data.recurringIssues.map((item) => (
              <li key={item.issue}>
                {item.issue} ({item.count})
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-wxIndigo500">
            Repeated issues will appear after Founder decisions. No issue is
            inferred automatically.
          </p>
        )}
      </div>
    </details>
  );
}

function BreakdownTable({
  title,
  rows
}: {
  title: string;
  rows: ReviewBreakdown[];
}) {
  return (
    <div className="overflow-x-auto">
      <h3 className="text-sm font-semibold text-wxIndigo900">{title}</h3>
      <table className="mt-3 w-full min-w-[480px] text-left text-xs">
        <thead className="text-wxIndigo500">
          <tr>
            <th className="pb-2 font-semibold">Group</th>
            <th className="pb-2 font-semibold">Total</th>
            <th className="pb-2 font-semibold">Pending</th>
            <th className="pb-2 font-semibold">Approved</th>
            <th className="pb-2 font-semibold">Improve</th>
            <th className="pb-2 font-semibold">Rejected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.dimension}:${row.key}`} className="border-t border-wxBorder">
              <td className="py-2 font-semibold text-wxIndigo700">{row.label}</td>
              <td className="py-2 text-wxIndigo600">{row.total}</td>
              <td className="py-2 text-wxIndigo600">{row.pending}</td>
              <td className="py-2 text-wxIndigo600">{row.approved}</td>
              <td className="py-2 text-wxIndigo600">{row.improvement_requested}</td>
              <td className="py-2 text-wxIndigo600">{row.rejected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionConflictDialog({
  conflict,
  busy,
  onCancel,
  onResolve
}: {
  conflict: VersionConflict;
  busy: boolean;
  onCancel: () => void;
  onResolve: (
    resolution: "create_next_version" | "keep_existing" | "request_improvement"
  ) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-conflict-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-amber-700">
              Version comparison required
            </p>
            <h2
              id="version-conflict-title"
              className="mt-1 text-xl font-semibold text-wxIndigo900"
            >
              A different approved version exists
            </h2>
            <p className="mt-2 text-sm text-wxIndigo600">
              Compare both exact checksums. The approved version will not be
              overwritten without your confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-wxBorder text-wxIndigo700 disabled:opacity-45"
            aria-label="Cancel version comparison"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <VersionComparisonCard
            title="Existing approved version"
            imageUrl={`/api/admin/website-experience/festival-review?governedPreview=${encodeURIComponent(conflict.existing.versionAssetId)}`}
            version={conflict.existing.version}
            checksum={conflict.existing.checksumSha256}
            date={conflict.existing.approvalDate}
            reviewer={conflict.existing.reviewerId}
          />
          <VersionComparisonCard
            title="New reviewed version"
            imageUrl={`/api/admin/website-experience/festival-review?preview=${encodeURIComponent(conflict.reviewItemId)}&kind=source`}
            version={conflict.reviewed.version}
            checksum={conflict.reviewed.checksumSha256}
            date={conflict.reviewed.reviewDate}
            reviewer={null}
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve("create_next_version")}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-45"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create as Next Version
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve("keep_existing")}
            className="min-h-11 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo800 disabled:opacity-45"
          >
            Keep Existing Approved Version
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve("request_improvement")}
            className="min-h-11 rounded-md border border-amber-500 bg-amber-50 px-4 text-sm font-semibold text-amber-900 disabled:opacity-45"
          >
            Mark New Version Needs Improvement
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-11 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700 disabled:opacity-45"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

function VersionComparisonCard({
  title,
  imageUrl,
  version,
  checksum,
  date,
  reviewer
}: {
  title: string;
  imageUrl: string;
  version: number;
  checksum: string;
  date: string | null;
  reviewer: string | null;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-wxBorder bg-wxSurfaceSoft">
      <div className="relative aspect-[16/8] bg-[linear-gradient(45deg,#eef2ff_25%,transparent_25%),linear-gradient(-45deg,#eef2ff_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef2ff_75%),linear-gradient(-45deg,transparent_75%,#eef2ff_75%)] bg-[length:18px_18px]">
        <Image
          src={imageUrl}
          alt={`${title} thumbnail`}
          fill
          unoptimized
          className="object-contain p-3"
        />
      </div>
      <dl className="grid gap-2 p-4 text-xs text-wxIndigo700">
        <div>
          <dt className="font-semibold text-wxIndigo900">{title}</dt>
          <dd className="mt-1">Version {version}</dd>
        </div>
        <div>
          <dt className="font-semibold">Checksum</dt>
          <dd className="mt-1 break-all font-mono">{checksum}</dd>
        </div>
        <div>
          <dt className="font-semibold">Decision date</dt>
          <dd className="mt-1">{date ? new Date(date).toLocaleString() : "Pending"}</dd>
        </div>
        {reviewer ? (
          <div>
            <dt className="font-semibold">Reviewer reference</dt>
            <dd className="mt-1 font-mono">{reviewer.slice(0, 8)}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function DecisionDialog({
  item,
  action,
  busy,
  onCancel,
  onConfirm
}: {
  item: FestivalFounderReviewItem;
  action: ReviewAction;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-[#070c26]/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-confirm-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-2xl">
        <h2 id="review-confirm-title" className="text-xl font-semibold text-wxIndigo900">
          {decisionCopy[action].label} exact asset version?
        </h2>
        <p className="mt-3 text-sm leading-6 text-wxIndigo600">
          This will {decisionCopy[action].verb} <strong>{item.display_name}</strong>.
          Approval promotes only checksum {item.checksum_sha256.slice(0, 10)}... to
          the governed private library. No festival, scene or login theme will be
          activated.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-10 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-wxViolet700 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm {decisionCopy[action].label}
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchApprovalDialog({
  items,
  busy,
  onCancel,
  onConfirm
}: {
  items: FestivalFounderReviewItem[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-[#070c26]/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-review-confirm-title"
    >
      <div className="w-full max-w-xl rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-2xl">
        <h2 id="batch-review-confirm-title" className="text-xl font-semibold text-wxIndigo900">
          Approve selected reviewed versions?
        </h2>
        <p className="mt-2 text-sm leading-6 text-wxIndigo600">
          Only assets opened in real-context preview are eligible. Approval promotes the exact versions below and does not activate a festival.
        </p>
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-xs text-wxIndigo700">
              <strong>{item.display_name}</strong>
              <span className="mt-1 block text-wxIndigo500">
                v{item.metadata_json?.version || 1} / checksum {item.checksum_sha256.slice(0, 12)}...
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-10 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || items.length === 0}
            onClick={onConfirm}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Approve Selected Reviewed Assets
          </button>
        </div>
      </div>
    </div>
  );
}

function CollectionButton({
  active,
  disabled,
  onClick,
  children
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? "border-wxViolet700 bg-wxViolet700 text-white"
          : "border-wxBorder bg-wxSurface text-wxIndigo700"
      }`}
    >
      {children}
    </button>
  );
}

function PreviewButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${
        active
          ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
          : "border-wxBorder bg-wxSurface text-wxIndigo600"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function IconToggle({
  active,
  label,
  onClick,
  children
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded ${
        active ? "bg-wxViolet700 text-white" : "text-wxIndigo500"
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Filter({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-wxIndigo600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-wxIndigo900"
      >
        <option value="">All</option>
        {options.filter(Boolean).map((option) => (
          <option key={option} value={option}>
            {humanise(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-wxIndigo800">{value}</p>
    </div>
  );
}

function contextLabel(category: string) {
  if (category === "header") return "Website Header placement";
  if (category === "ground") return "Ground / page-bottom placement";
  if (category === "axo") return "AXO placement";
  return "Website Scene effect";
}
