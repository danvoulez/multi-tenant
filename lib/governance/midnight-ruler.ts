/**
 * LogLine Constitution v1.1 — Midnight Ruler Scheduler
 * 
 * This module implements the constitutional enforcement mechanism:
 * §6: Midnight Ruler — Normative Law
 * §7: Timezone Configuration
 * §8: Execution Model (Normative)
 * §17: Error Recovery & Fault Tolerance
 * 
 * The Midnight Ruler MUST run daily at 00:00:00 in the configured timezone.
 */

import {
  GovernableSpan,
  LawDefinition,
  MidnightRulerConfig,
  GovernanceError,
} from "./types";
import {
  createLawDecisionSpan,
  createLedgerEvent,
  validateGovernableSpan,
  getNextMidnight,
  checkClockDrift,
  validateTimezone,
} from "./span";
import {
  evaluateLaw,
  buildEvaluationContext,
  actionToObligation,
} from "./triage";

/**
 * Midnight Ruler Engine
 * 
 * §8: A scheduler MUST run daily at local 00:00:00 (per selected timezone).
 */
export class MidnightRuler {
  private config: MidnightRulerConfig;
  private schedulerId: NodeJS.Timeout | null = null;
  private running = false;

  constructor(config: MidnightRulerConfig) {
    // §7: Validate timezone
    if (!validateTimezone(config.timezone)) {
      throw new Error(
        `Invalid IANA timezone: ${config.timezone} (§7 tzdata corruption)`
      );
    }

    this.config = {
      ...config,
      clock_drift_threshold_ms: config.clock_drift_threshold_ms ?? 500, // §17: RECOMMENDED ≤ 500ms
    };
  }

  /**
   * Start the Midnight Ruler scheduler.
   * 
   * §8: MUST run daily at 00:00:00.
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn("Midnight Ruler already running");
      return;
    }

    this.running = true;
    console.log(
      `Midnight Ruler started for tenant ${this.config.tenant_id} (${this.config.timezone})`
    );

    // Schedule next midnight execution
    await this.scheduleNextRun();
  }

  /**
   * Stop the Midnight Ruler scheduler.
   */
  stop(): void {
    if (this.schedulerId) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    this.running = false;
    console.log(`Midnight Ruler stopped for tenant ${this.config.tenant_id}`);
  }

  /**
   * Schedule the next midnight execution.
   */
  private async scheduleNextRun(): Promise<void> {
    const nextMidnight = getNextMidnight(this.config.timezone);
    const now = new Date();
    const delay = nextMidnight.getTime() - now.getTime();

    console.log(
      `Next Midnight Ruler execution at ${nextMidnight.toISOString()} (in ${Math.round(delay / 1000)}s)`
    );

    this.schedulerId = setTimeout(async () => {
      await this.executeMidnightRun();
      if (this.running) {
        await this.scheduleNextRun();
      }
    }, delay);
  }

  /**
   * Execute the midnight governance run.
   * 
   * §8: For each active deliverable:
   * 1. Build ctx
   * 2. Select laws
   * 3. Evaluate ok → doubt → not
   * 4. Emit Law Decision Span and Ledger Events
   * 5. Honor idempotency
   */
  private async executeMidnightRun(): Promise<void> {
    console.log(
      `Executing Midnight Ruler for tenant ${this.config.tenant_id} at ${new Date().toISOString()}`
    );

    try {
      // §17: Check clock drift
      const drift = checkClockDrift();
      if (drift > this.config.clock_drift_threshold_ms!) {
        await this.handleError({
          type: "clock_drift",
          message: `Clock drift ${drift}ms exceeds threshold ${this.config.clock_drift_threshold_ms}ms`,
        });
        return;
      }

      // Fetch active deliverables (mock - implement actual fetching)
      const spans = await this.fetchActiveDeliverables();

      console.log(`Processing ${spans.length} active deliverables`);

      for (const span of spans) {
        await this.processSpan(span);
      }

      console.log("Midnight Ruler execution completed");
    } catch (error) {
      console.error("Midnight Ruler execution failed", error);
      await this.handleError({
        type: "scheduler_failure",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Process a single governable span.
   * 
   * §8 Execution Model steps 1-5.
   */
  private async processSpan(span: GovernableSpan): Promise<void> {
    try {
      // §9: Validate constitutional invariants
      validateGovernableSpan(span);

      // §8.1: Build evaluation context
      const ctx = buildEvaluationContext(span, {
        id: this.config.tenant_id,
        quorum: this.config.quorum,
        timezone: this.config.timezone,
      });

      // §8.2: Select laws (use targets or default for resource type)
      const targetLaws = span.law?.targets || [];
      const laws = this.config.laws.filter(
        (law) =>
          targetLaws.includes(law.id) ||
          (law.scope === span.resource.type && targetLaws.length === 0)
      );

      if (laws.length === 0) {
        console.warn(`No laws found for span ${span.id}`);
        return;
      }

      // §8.3: Evaluate laws (first matching law wins)
      for (const law of laws) {
        const result = evaluateLaw(law, ctx);
        if (result) {
          await this.executeDecision(span, law, result.triage, result.actions);
          break;
        }
      }
    } catch (error) {
      // §17: Poison inputs - fail-closed to doubt
      console.error(`Error processing span ${span.id}`, error);
      await this.handleError({
        type: "poison_input",
        message: error instanceof Error ? error.message : String(error),
        span_id: span.id,
        trace_id: span.trace_id,
      });
    }
  }

  /**
   * Execute a law decision and emit decision span + ledger events.
   * 
   * §8.4: Emit Law Decision Span and Ledger Events.
   * §8.5: Honor idempotency.
   */
  private async executeDecision(
    span: GovernableSpan,
    law: LawDefinition,
    triage: "ok" | "doubt" | "not",
    actions: any[]
  ): Promise<void> {
    // §4.2: Create Law Decision Span
    const decisionSpan = createLawDecisionSpan({
      tenant_id: span.tenant_id,
      resource: span.resource,
      triage,
      obligations: actions.map(actionToObligation),
      law_targets: [law.id],
      law_scope: law.scope,
      law_text_hash: law.hash || "blake3:unknown",
      caused_by_span_id: span.id,
      trace_id: span.trace_id,
      timezone: this.config.timezone,
    });

    console.log(
      `Decision: ${triage} for ${span.resource.type}:${span.resource.id} (${actions.length} actions)`
    );

    // §13: Check idempotency (mock - implement actual deduplication)
    const isDuplicate = await this.checkIdempotency(decisionSpan.idempotency_key);
    if (isDuplicate) {
      console.log(`Skipping duplicate decision ${decisionSpan.idempotency_key}`);
      return;
    }

    // §11: Execute actions in constitutional order
    for (const action of actions) {
      await this.executeAction(action, span, decisionSpan.id);
    }

    // Store decision span (mock - implement actual storage)
    await this.storeDecisionSpan(decisionSpan);
  }

  /**
   * Execute a single action and emit ledger event.
   * 
   * §4.3: Every effect MUST emit an event.
   */
  private async executeAction(
    action: any,
    span: GovernableSpan,
    decisionSpanId: string
  ): Promise<void> {
    const event = createLedgerEvent({
      who: { id: "policy_agent", role: "system" },
      what: `${span.resource.type}.${action.type}`,
      why: action.reason || action.type,
      resource: span.resource,
      decision_span_id: decisionSpanId,
      trace_id: span.trace_id,
      metadata: action,
    });

    // Emit to ledger (mock - implement actual ledger append)
    console.log(`Ledger event: ${event.what} (${event.why})`);
    await this.appendToLedger(event);
  }

  /**
   * Handle governance errors following constitutional error recovery.
   * 
   * §17: Error Recovery & Fault Tolerance
   */
  private async handleError(error: GovernanceError): Promise<void> {
    console.error(`Governance error [${error.type}]:`, error.message);

    // §17: Fail-closed to doubt semantics
    if (error.type === "clock_drift" || error.type === "tzdata_corruption") {
      // Block state transitions, notify ops
      console.warn("Failing closed to doubt - state transitions blocked");
      // TODO: Implement notification to ops
    }

    // Record incident event
    const incidentEvent = {
      ts: new Date().toISOString(),
      type: "governance.incident",
      error_type: error.type,
      message: error.message,
      span_id: error.span_id,
      trace_id: error.trace_id,
      metadata: error.metadata,
    };

    await this.appendToLedger(incidentEvent);
  }

  // Mock implementations - replace with actual data sources

  private async fetchActiveDeliverables(): Promise<GovernableSpan[]> {
    // TODO: Implement actual fetching from database
    // Should fetch all active deliverables for this tenant
    return [];
  }

  private async checkIdempotency(key: string): Promise<boolean> {
    // TODO: Implement actual idempotency check
    // Check if this idempotency_key was already processed
    return false;
  }

  private async storeDecisionSpan(span: any): Promise<void> {
    // TODO: Implement actual storage to PostgreSQL ledger
    console.log(`Stored decision span: ${span.id}`);
  }

  private async appendToLedger(event: any): Promise<void> {
    // TODO: Implement actual append to PostgreSQL ledger
    console.log(`Appended to ledger: ${event.what || event.type}`);
  }
}

/**
 * Create and start a Midnight Ruler for a tenant.
 * 
 * Example usage:
 * ```typescript
 * const ruler = createMidnightRuler({
 *   tenant_id: "voulezvous",
 *   timezone: "Europe/Paris",
 *   quorum: 2,
 *   laws: [midnightDeadlineLaw],
 * });
 * await ruler.start();
 * ```
 */
export function createMidnightRuler(config: MidnightRulerConfig): MidnightRuler {
  return new MidnightRuler(config);
}
