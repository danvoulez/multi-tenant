/**
 * LogLine Governance — Constitutional Implementation
 * 
 * This module implements the LogLine Constitution v1.1 for Next.js applications.
 * 
 * @see https://github.com/danvoulez/LogLine-Ruleset
 * 
 * Key Exports:
 * - Types: GovernableSpan, LawDecisionSpan, LedgerEvent, LawDefinition
 * - Span Utilities: createGovernableSpan, validateGovernableSpan, createTraceId, createIdempotencyKey
 * - Law Parser: parseLawFile, loadLawFile, hashLawText
 * - Triage Engine: evaluateLaw, buildEvaluationContext, composeActions
 * - Midnight Ruler: MidnightRuler, createMidnightRuler
 * - Metrics: GovernanceMetrics, trackDecision, trackAction, trackError
 */

// Types (§4 Canonical Data Model)
export type {
  GovernableSpan,
  LawDecisionSpan,
  LedgerEvent,
  TriageOutcome,
  LawAction,
  LawDefinition,
  PolicyLayer,
  EvaluationContext,
  MidnightRulerConfig,
  GovernanceError,
} from "./types";

export { PolicyLayer } from "./types";

// Span Utilities (§9 Constitutional Invariants, §13 Idempotency & Trace)
export {
  createIdempotencyKey,
  createTraceId,
  getCurrentClock,
  createGovernableSpan,
  createLawDecisionSpan,
  createLedgerEvent,
  validateGovernableSpan,
  validateTimezone,
  isMidnight,
  getNextMidnight,
  checkClockDrift,
  sanitizeSpan,
} from "./span";

// Law Parser (§5 Law Grammar & Expression)
export {
  parseLawFile,
  hashLawText,
  loadLawFile,
} from "./law-parser";

// Triage Engine (§8 Execution Model, §10 Conflict Resolution)
export {
  evaluateExpression,
  evaluateLaw,
  composeActions,
  actionToObligation,
  buildEvaluationContext,
} from "./triage";

// Midnight Ruler (§6 Midnight Ruler, §8 Execution Model)
export {
  MidnightRuler,
  createMidnightRuler,
} from "./midnight-ruler";

// Metrics & Observability (§19)
export {
  GovernanceMetrics,
  getMetrics,
  trackDecision,
  trackAction,
  trackError,
  trackClockDrift,
} from "./metrics";

export type { MetricsCollector } from "./metrics";
