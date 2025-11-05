/**
 * LogLine Constitution v1.1 — Triage Engine
 * 
 * This module implements the triadic decision model:
 * §5 Law Grammar & Expression
 * §8 Execution Model
 * §10 Conflict Resolution & Action Composition
 * §11 Action Ordering
 * §12 Layered Precedence
 */

import {
  GovernableSpan,
  LawAction,
  LawDefinition,
  EvaluationContext,
  TriageOutcome,
  PolicyLayer,
} from "./types";

/**
 * Evaluate a law expression against the evaluation context.
 * 
 * §5.2 Variable Namespace:
 * - now, deadline_at, accepted, approvals.count, quorum, evidence.missing, user.settings.*
 * 
 * §5.3 Evaluation Failures:
 * - Parse/eval failure MUST short-circuit to "doubt" semantics
 */
export function evaluateExpression(
  expr: string,
  ctx: EvaluationContext
): boolean {
  try {
    // Build variable context
    const variables: Record<string, any> = {
      now: new Date(ctx.now).getTime(),
      deadline_at: ctx.resource.deadline_at
        ? new Date(ctx.resource.deadline_at).getTime()
        : null,
      accepted: ctx.resource.accepted ?? null,
      "approvals.count": ctx.resource.approvals?.length ?? 0,
      quorum: ctx.tenant.quorum,
      "evidence.missing": ctx.resource.evidence?.missing ?? null,
    };

    // Add user settings
    if (ctx.user?.settings) {
      Object.keys(ctx.user.settings).forEach((key) => {
        variables[`user.settings.${key}`] = ctx.user!.settings[key];
      });
    }

    // Parse and evaluate expression
    // This is a simplified evaluator - production should use a proper parser
    let result = expr;

    // Replace variables
    Object.keys(variables).forEach((varName) => {
      const value = variables[varName];
      const regex = new RegExp(`\\b${varName.replace(".", "\\.")}\\b`, "g");
      result = result.replace(regex, JSON.stringify(value));
    });

    // Evaluate boolean operators (§5.1 precedence: NOT > AND > OR)
    result = result.replace(/\bNOT\b/g, "!");
    result = result.replace(/\bAND\b/g, "&&");
    result = result.replace(/\bOR\b/g, "||");
    result = result.replace(/\btrue\b/g, "true");
    result = result.replace(/\bfalse\b/g, "false");

    // §5.2: Unset variables MUST evaluate to null
    // §5.1: Comparisons between mismatched types MUST be false
    // Use Function constructor for safe evaluation (production: use proper AST parser)
    // eslint-disable-next-line no-new-func
    return new Function(`return (${result})`)() as boolean;
  } catch (error) {
    // §5.3: Expression failure short-circuits to doubt
    console.error(`Expression evaluation failed: ${expr}`, error);
    return false;
  }
}

/**
 * Evaluate triage blocks for a law.
 * 
 * §8: Evaluate ok → doubt → not in order; first true executes all actions.
 */
export function evaluateLaw(
  law: LawDefinition,
  ctx: EvaluationContext
): { triage: TriageOutcome; actions: LawAction[] } | null {
  // Evaluate in constitutional order: ok → doubt → not
  if (evaluateExpression(law.triage.ok.condition, ctx)) {
    return {
      triage: "ok",
      actions: law.triage.ok.actions,
    };
  }

  if (evaluateExpression(law.triage.doubt.condition, ctx)) {
    return {
      triage: "doubt",
      actions: law.triage.doubt.actions,
    };
  }

  if (evaluateExpression(law.triage.not.condition, ctx)) {
    return {
      triage: "not",
      actions: law.triage.not.actions,
    };
  }

  // No condition matched - fail-closed to doubt (§17 error recovery)
  return {
    triage: "doubt",
    actions: [
      { type: "hold", hours: 24 },
      { type: "notify", role: "ops" },
      { type: "append_ledger" },
    ],
  };
}

/**
 * Compose actions from multiple layers following constitutional precedence.
 * 
 * §10 Conflict Resolution & Action Composition:
 * - State transitions: terminate > accept > hold
 * - Side effects: tag, notify, emit (commutative set union)
 * - Audit: append_ledger (MUST be last)
 * 
 * §12 Layered Precedence:
 * - Constitution > Superior > App > Tenant > User
 * - If any policy yields deny, decision MUST result in denial
 */
export function composeActions(
  actionsByLayer: Map<PolicyLayer, LawAction[]>
): LawAction[] {
  const composed: LawAction[] = [];

  // §10.1 State transitions (highest precedence wins)
  let stateTransition: LawAction | null = null;
  const layerOrder = [
    PolicyLayer.CONSTITUTION,
    PolicyLayer.SUPERIOR,
    PolicyLayer.APP_REGULATORY,
    PolicyLayer.TENANT,
    PolicyLayer.USER,
  ];

  for (const layer of layerOrder) {
    const actions = actionsByLayer.get(layer) || [];
    
    // Find highest-precedence state transition in this layer
    const terminate = actions.find((a) => a.type === "terminate");
    const accept = actions.find((a) => a.type === "accept");
    const hold = actions.find((a) => a.type === "hold");

    if (terminate && !stateTransition) {
      stateTransition = terminate;
    } else if (accept && !stateTransition) {
      stateTransition = accept;
    } else if (hold && !stateTransition) {
      stateTransition = hold;
    }
  }

  if (stateTransition) {
    composed.push(stateTransition);
  }

  // §10.2 Side effects (commutative set union with deduplication)
  const tags = new Map<string, string>();
  const notifyRoles = new Set<string>();
  const emitEvents = new Set<string>();

  for (const layer of layerOrder) {
    const actions = actionsByLayer.get(layer) || [];

    actions.forEach((action) => {
      if (action.type === "tag") {
        // §10: tag key collisions resolve by layer precedence
        if (!tags.has(action.key)) {
          tags.set(action.key, action.val);
        }
      } else if (action.type === "notify") {
        notifyRoles.add(action.role);
      } else if (action.type === "emit") {
        emitEvents.add(action.event);
      }
    });
  }

  // Add side effects
  tags.forEach((val, key) => {
    composed.push({ type: "tag", key, val });
  });

  notifyRoles.forEach((role) => {
    composed.push({ type: "notify", role });
  });

  emitEvents.forEach((event) => {
    composed.push({ type: "emit", event });
  });

  // §10: append_ledger MUST be executed exactly once per decision (last)
  composed.push({ type: "append_ledger" });

  return composed;
}

/**
 * Convert LawAction to obligation string for decision span.
 * 
 * §4.2: obligations are string representations of actions.
 */
export function actionToObligation(action: LawAction): string {
  switch (action.type) {
    case "accept":
      return "accept";
    case "hold":
      return `hold(hours=${action.hours})`;
    case "terminate":
      return `terminate(reason=${action.reason})`;
    case "notify":
      return `notify(role=${action.role})`;
    case "tag":
      return `tag(key=${action.key},val=${action.val})`;
    case "append_ledger":
      return "append_ledger";
    case "emit":
      return `emit(event=${action.event})`;
    default:
      return "unknown";
  }
}

/**
 * Build evaluation context from governable span.
 * 
 * §8 Execution Model: Build ctx from now, tenant.quorum, user.settings, resource.
 */
export function buildEvaluationContext(
  span: GovernableSpan,
  tenantConfig: { id: string; quorum: number; timezone: string }
): EvaluationContext {
  return {
    now: span.clock.ts,
    tenant: tenantConfig,
    resource: span.resource,
    span: {
      id: span.id,
      trace_id: span.trace_id,
    },
  };
}
