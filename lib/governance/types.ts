/**
 * LogLine Constitution v1.1 — Canonical Data Types
 * 
 * This module implements §4 of the LogLine Constitution:
 * - §4.1 Governable Span (input)
 * - §4.2 Law Decision Span (output)
 * - §4.3 Ledger Event (audit)
 * 
 * All types follow the constitutional requirements for:
 * - Append-only ledger semantics
 * - Idempotency (§13)
 * - Traceability (§13)
 * - Who-did-what-when audit trail (§9)
 */

/**
 * §4.1 Governable Span (input)
 * 
 * A span intended to be governed MUST include these REQUIRED fields:
 * - tenant_id, app, resource.type, resource.id
 * - who.id, who.role
 * - clock.ts, clock.tz
 * - trace_id, idempotency_key
 */
export interface GovernableSpan {
  /** Unique span identifier: span:<namespace>:<uuid> */
  id: string;
  
  /** Type of activity (MUST be "activity" for governable spans) */
  type: "activity";
  
  /** REQUIRED: Tenant identifier for multi-tenancy isolation */
  tenant_id: string;
  
  /** REQUIRED: Application identifier */
  app: string;
  
  /** REQUIRED: Resource being governed */
  resource: {
    /** Resource type (e.g., "deliverable", "contract", "approval") */
    type: string;
    
    /** Unique resource identifier */
    id: string;
    
    /** For deliverable scope: MUST provide deadline_at */
    deadline_at?: string; // ISO 8601 with timezone
    
    /** For deliverable scope: SHOULD provide accepted status */
    accepted?: boolean;
    
    /** For deliverable scope: SHOULD provide approvals */
    approvals?: Array<{
      who: string;
      role: string;
      timestamp: string;
    }>;
    
    /** Evidence attachments (OPTIONAL) */
    evidence?: {
      missing?: boolean;
      documents?: string[];
    };
    
    /** Additional resource-specific fields */
    [key: string]: any;
  };
  
  /** REQUIRED: Actor who initiated this span */
  who: {
    /** Actor identifier (e.g., email, user_id) */
    id: string;
    
    /** Actor role (e.g., "ops", "admin", "user") */
    role: string;
  };
  
  /** REQUIRED: Clock information (§9 constitutional invariant) */
  clock: {
    /** ISO 8601 timestamp with timezone */
    ts: string;
    
    /** IANA timezone identifier (e.g., "Europe/Paris") */
    tz: string;
  };
  
  /** REQUIRED: Trace ID for end-to-end correlation (§13) */
  trace_id: string;
  
  /** REQUIRED: Idempotency key to prevent duplicate effects (§13) */
  idempotency_key: string;
  
  /** Law governance configuration */
  law?: {
    /** Scope selector (e.g., "deliverable", "*") */
    scope: string;
    
    /** Target law identifiers (e.g., ["midnight_deadline:1.0.0"]) */
    targets: string[];
    
    /** Triage result: "ok" | "doubt" | "not" | "auto" */
    triage?: "ok" | "doubt" | "not" | "auto";
    
    /** Clock override: "midnight <IANA_TZ>" (§7) */
    clock?: string;
  };
  
  /** Links to related spans */
  links?: {
    parent_span?: string;
    contract_id?: string;
    [key: string]: string | undefined;
  };
}

/**
 * §4.2 Law Decision Span (output)
 * 
 * Produced by the Law engine after evaluating governance rules.
 * MUST include all constitutional invariants (§9).
 */
export interface LawDecisionSpan {
  /** Decision span identifier: span:law.decision:<uuid> */
  id: string;
  
  /** MUST be "law.decision" */
  type: "law.decision";
  
  /** Tenant context */
  tenant_id: string;
  
  /** MUST be "governance" for law decisions */
  app: "governance";
  
  /** Resource that was evaluated */
  resource: {
    type: string;
    id: string;
    [key: string]: any;
  };
  
  /** MUST be system actor for law decisions */
  who: {
    id: "policy_agent";
    role: "system";
  };
  
  /** Clock at decision time (§9 invariant: clock_present) */
  clock: {
    ts: string;
    tz: string;
  };
  
  /** Law evaluation results */
  law: {
    /** Scope that was evaluated */
    scope: string;
    
    /** Laws that were applied */
    targets: string[];
    
    /** Triage result: "ok" | "doubt" | "not" */
    triage: "ok" | "doubt" | "not";
    
    /** Ordered list of actions to execute (§11 action ordering) */
    obligations: string[];
    
    /** BLAKE3 hash of law text (for integrity verification) */
    law_text_hash: string;
    
    /** Unique decision run identifier */
    decision_id: string;
  };
  
  /** MUST link to input span (§9 invariant: traceability) */
  links: {
    caused_by: string;
  };
  
  /** Trace ID for correlation (§13) */
  trace_id: string;
  
  /** Idempotency key (§13) */
  idempotency_key: string;
}

/**
 * §4.3 Ledger Event (audit)
 * 
 * Every effect MUST emit an event for append-only audit trail.
 * Implements §9 constitutional invariants (who_required, ledger_required).
 */
export interface LedgerEvent {
  /** ISO 8601 timestamp of the event */
  ts: string;
  
  /** REQUIRED: Actor who caused this effect (§9 who_required) */
  who: {
    id: string;
    role: string;
  };
  
  /** REQUIRED: What action was performed */
  what: string; // e.g., "deliverable.terminate", "deliverable.accept"
  
  /** REQUIRED: Why this action was taken */
  why: string; // e.g., "deadline_passed", "quorum_reached"
  
  /** Resource that was affected */
  resource: {
    type: string;
    id: string;
    contract_id?: string;
    [key: string]: any;
  };
  
  /** REQUIRED: Links to decision span (§9 traceability) */
  links: {
    decision_span: string;
    trace_id?: string;
  };
  
  /** Additional metadata */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Triage Outcomes (§5 and §8)
 * 
 * The triadic decision model: if ok → if doubt → if not
 */
export type TriageOutcome = "ok" | "doubt" | "not";

/**
 * Law Actions (§5.1 Grammar and §10 Conflict Resolution)
 * 
 * Categorized by precedence class:
 * 1. State transitions: terminate > accept > hold
 * 2. Side effects: tag, notify, emit (commutative set union)
 * 3. Audit: append_ledger (MUST be last)
 */
export type LawAction =
  | { type: "accept" }
  | { type: "hold"; hours: number }
  | { type: "terminate"; reason: string }
  | { type: "notify"; role: string }
  | { type: "tag"; key: string; val: string }
  | { type: "append_ledger" }
  | { type: "emit"; event: string };

/**
 * Law Definition (§5 Grammar)
 * 
 * Represents a parsed .law file following the constitutional grammar.
 */
export interface LawDefinition {
  /** Law identifier: name:version */
  id: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Scope selector (e.g., "deliverable", "*") */
  scope: string;
  
  /** Clock specification: "midnight <IANA_TZ>" or cron spec */
  clock: string;
  
  /** Triage blocks */
  triage: {
    /** if ok: condition → actions */
    ok: {
      condition: string; // Expression to evaluate
      actions: LawAction[];
    };
    
    /** if doubt: condition → actions */
    doubt: {
      condition: string;
      actions: LawAction[];
    };
    
    /** if not: condition → actions */
    not: {
      condition: string;
      actions: LawAction[];
    };
  };
  
  /** Optional settings */
  settings?: Record<string, any>;
  
  /** BLAKE3 hash of law text (§18 lifecycle) */
  hash?: string;
}

/**
 * Constitutional Layers (§3 and §12)
 * 
 * Precedence order (high → low):
 * Constitution > Superior > App > Tenant > User
 */
export enum PolicyLayer {
  CONSTITUTION = "constitution",
  SUPERIOR = "superior",
  APP_REGULATORY = "app_regulatory",
  TENANT = "tenant",
  USER = "user",
}

/**
 * Evaluation Context (§8 Execution Model)
 * 
 * Context provided to law expression evaluator.
 */
export interface EvaluationContext {
  /** Current time (ISO 8601) */
  now: string;
  
  /** Tenant configuration */
  tenant: {
    id: string;
    quorum: number;
    timezone: string; // IANA timezone
    [key: string]: any;
  };
  
  /** User settings (§3 layer 5) */
  user?: {
    settings: Record<string, any>;
  };
  
  /** Resource being evaluated */
  resource: GovernableSpan["resource"];
  
  /** Span metadata */
  span: {
    id: string;
    trace_id: string;
  };
}

/**
 * Midnight Ruler Configuration (§6 and §7)
 */
export interface MidnightRulerConfig {
  /** IANA timezone (default: "Europe/Paris") */
  timezone: string;
  
  /** Tenant ID */
  tenant_id: string;
  
  /** Default quorum for approvals */
  quorum: number;
  
  /** Active laws for this tenant */
  laws: LawDefinition[];
  
  /** Clock drift tolerance in milliseconds (§17: RECOMMENDED ≤ 500ms) */
  clock_drift_threshold_ms?: number;
}

/**
 * Error Recovery (§17)
 * 
 * Structured error types for constitutional error handling.
 */
export interface GovernanceError {
  type: "scheduler_failure" | "partial_execution" | "clock_drift" | "tzdata_corruption" | "poison_input" | "expression_error";
  message: string;
  span_id?: string;
  trace_id?: string;
  metadata?: Record<string, any>;
}
