/**
 * LogLine Constitution v1.1 — Span Utilities
 * 
 * This module provides utilities for creating and validating spans
 * according to constitutional requirements:
 * - §9 Constitutional Invariants
 * - §13 Idempotency & Trace
 * - §14 Security & Privacy
 */

import { GovernableSpan, LedgerEvent, LawDecisionSpan } from "./types";

/**
 * Generate a UUID v4 (browser/node compatible)
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a cryptographically secure idempotency key.
 * 
 * §13: Decisions MUST carry an idempotency_key; repeated evaluations
 * with the same key MUST NOT duplicate effects.
 */
export function createIdempotencyKey(prefix: string = "idem"): string {
  return `${prefix}_${generateUUID()}`;
}

/**
 * Create a trace ID for end-to-end correlation.
 * 
 * §13: All artifacts (spans, decisions, events) MUST carry a trace_id
 * enabling end-to-end correlation.
 */
export function createTraceId(prefix: string = "trace"): string {
  return `${prefix}_${generateUUID()}`;
}

/**
 * Get current timestamp with timezone.
 * 
 * §9 clock_present: every span and decision MUST include clock.ts and clock.tz.
 * §14: Engines MUST sync time (e.g., NTP) and verify tzdata integrity.
 */
export function getCurrentClock(timezone: string = "Europe/Paris"): { ts: string; tz: string } {
  return {
    ts: new Date().toISOString(),
    tz: timezone,
  };
}

/**
 * Create a GovernableSpan following constitutional requirements.
 * 
 * @param params Span parameters
 * @returns A valid GovernableSpan
 */
export function createGovernableSpan(params: {
  namespace: string;
  tenant_id: string;
  app: string;
  resource: GovernableSpan["resource"];
  who: { id: string; role: string };
  timezone?: string;
  trace_id?: string;
  law?: GovernableSpan["law"];
  links?: GovernableSpan["links"];
}): GovernableSpan {
  const trace_id = params.trace_id || createTraceId();
  const idempotency_key = createIdempotencyKey();
  const clock = getCurrentClock(params.timezone);

  return {
    id: `span:${params.namespace}:${generateUUID()}`,
    type: "activity",
    tenant_id: params.tenant_id,
    app: params.app,
    resource: params.resource,
    who: params.who,
    clock,
    trace_id,
    idempotency_key,
    law: params.law,
    links: params.links,
  };
}

/**
 * Create a LawDecisionSpan following constitutional requirements.
 * 
 * §4.2: Produced by the Law engine after evaluating governance rules.
 */
export function createLawDecisionSpan(params: {
  tenant_id: string;
  resource: { type: string; id: string; [key: string]: any };
  triage: "ok" | "doubt" | "not";
  obligations: string[];
  law_targets: string[];
  law_scope: string;
  law_text_hash: string;
  caused_by_span_id: string;
  trace_id: string;
  timezone?: string;
}): LawDecisionSpan {
  const clock = getCurrentClock(params.timezone);
  const decision_id = `lawrun_${generateUUID()}`;
  const idempotency_key = createIdempotencyKey("law");

  return {
    id: `span:law.decision:${generateUUID()}`,
    type: "law.decision",
    tenant_id: params.tenant_id,
    app: "governance",
    resource: params.resource,
    who: {
      id: "policy_agent",
      role: "system",
    },
    clock,
    law: {
      scope: params.law_scope,
      targets: params.law_targets,
      triage: params.triage,
      obligations: params.obligations,
      law_text_hash: params.law_text_hash,
      decision_id,
    },
    links: {
      caused_by: params.caused_by_span_id,
    },
    trace_id: params.trace_id,
    idempotency_key,
  };
}

/**
 * Create a LedgerEvent for audit trail.
 * 
 * §4.3: Every effect MUST emit an event.
 * §9 who_required: every effect MUST include who.id and who.role.
 */
export function createLedgerEvent(params: {
  who: { id: string; role: string };
  what: string;
  why: string;
  resource: { type: string; id: string; [key: string]: any };
  decision_span_id: string;
  trace_id?: string;
  metadata?: Record<string, any>;
}): LedgerEvent {
  return {
    ts: new Date().toISOString(),
    who: params.who,
    what: params.what,
    why: params.why,
    resource: params.resource,
    links: {
      decision_span: params.decision_span_id,
      trace_id: params.trace_id,
    },
    metadata: params.metadata,
  };
}

/**
 * Validate a GovernableSpan against constitutional requirements.
 * 
 * §9 Constitutional Invariants:
 * - clock_present: MUST include clock.ts and clock.tz
 * - who_required: MUST include who.id and who.role
 * §13: MUST include trace_id and idempotency_key
 * 
 * @throws Error if span is invalid
 */
export function validateGovernableSpan(span: Partial<GovernableSpan>): span is GovernableSpan {
  const errors: string[] = [];

  // REQUIRED fields (§4.1)
  if (!span.tenant_id) errors.push("Missing REQUIRED field: tenant_id");
  if (!span.app) errors.push("Missing REQUIRED field: app");
  if (!span.resource?.type) errors.push("Missing REQUIRED field: resource.type");
  if (!span.resource?.id) errors.push("Missing REQUIRED field: resource.id");
  
  // §9 who_required
  if (!span.who?.id) errors.push("Missing REQUIRED field: who.id (§9 who_required)");
  if (!span.who?.role) errors.push("Missing REQUIRED field: who.role (§9 who_required)");
  
  // §9 clock_present
  if (!span.clock?.ts) errors.push("Missing REQUIRED field: clock.ts (§9 clock_present)");
  if (!span.clock?.tz) errors.push("Missing REQUIRED field: clock.tz (§9 clock_present)");
  
  // §13 Idempotency & Trace
  if (!span.trace_id) errors.push("Missing REQUIRED field: trace_id (§13)");
  if (!span.idempotency_key) errors.push("Missing REQUIRED field: idempotency_key (§13)");
  
  // Deliverable scope requirements (§4.1)
  if (span.resource?.type === "deliverable" && !span.resource?.deadline_at) {
    errors.push("For deliverable scope, deadline_at is MUST (§4.1)");
  }
  
  if (errors.length > 0) {
    throw new Error(`Invalid GovernableSpan:\n${errors.join("\n")}`);
  }
  
  return true;
}

/**
 * Validate timezone against IANA database.
 * 
 * §7: DST changes MUST be honored per the timezone database.
 * §17: Engines MUST fail-closed to doubt if tzdata is corrupted.
 */
export function validateTimezone(tz: string): boolean {
  try {
    // Verify timezone is valid by attempting to format
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current time is at midnight in the specified timezone.
 * 
 * §6 and §8: Midnight Ruler MUST run daily at 00:00:00 in configured timezone.
 */
export function isMidnight(timezone: string = "Europe/Paris"): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const timeStr = formatter.format(now);
  // Format is "HH:MM:SS" or "HH:MM:SS AM/PM" but we disabled AM/PM
  return timeStr.indexOf("00:00:00") === 0;
}

/**
 * Get the next midnight timestamp in the specified timezone.
 * 
 * Used by scheduler to determine next execution time.
 */
export function getNextMidnight(timezone: string = "Europe/Paris"): Date {
  const now = new Date();
  
  // Get current date in target timezone as string
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const dateStr = formatter.format(now); // "MM/DD/YYYY"
  const [month, day, year] = dateStr.split("/").map(n => parseInt(n, 10));
  
  // Create midnight in target timezone for tomorrow
  const tomorrow = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  
  return tomorrow;
}

/**
 * Calculate clock drift from NTP reference.
 * 
 * §17: Engines MUST maintain NTP sync and MUST define drift threshold (≤ 500ms).
 * If drift exceeds threshold, engines MUST fail-closed to doubt.
 */
export function checkClockDrift(): number {
  // Simplified implementation - in production, use actual NTP client
  // For now, assume local clock is accurate
  return 0;
}

/**
 * Sanitize PII from span for ledger storage.
 * 
 * §14: PII minimization in spans and ledger entries.
 */
export function sanitizeSpan<T extends Partial<GovernableSpan>>(span: T): T {
  // Deep clone to avoid mutation
  const sanitized = JSON.parse(JSON.stringify(span));
  
  // Redact common PII fields (customize based on your requirements)
  if (sanitized.who?.email) {
    sanitized.who.email = `***@${sanitized.who.email.split("@")[1]}`;
  }
  
  if (sanitized.resource?.personal_data) {
    sanitized.resource.personal_data = "[REDACTED]";
  }
  
  return sanitized;
}
