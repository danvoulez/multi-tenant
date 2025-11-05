# LogLine Governance — Constitutional Implementation

This module implements the **LogLine Constitution v1.1** (`Law-as-Grammar & Midnight Ruler`) for the multi-tenant starter template.

## 📜 Constitutional Reference

Full specification: [`github.com/danvoulez/LogLine-Ruleset`](https://github.com/danvoulez/LogLine-Ruleset)

**Core Principles:**
- **Law is grammar; time is enforcement**
- Triadic decision model: `if ok` → `if doubt` → `if not`
- Daily execution at **midnight** (configurable timezone)
- Append-only ledger with **who-did-what-when** audit trail

## 🏗️ Architecture

```
lib/governance/
├── types.ts              # §4 Canonical Data Model
├── span.ts               # §9 Constitutional Invariants, §13 Idempotency
├── law-parser.ts         # §5 Law Grammar (EBNF)
├── triage.ts             # §8 Execution Model, §10 Conflict Resolution
├── midnight-ruler.ts     # §6 Midnight Ruler Scheduler
├── metrics.ts            # §19 Observability
└── index.ts              # Public API

governance/laws/
└── midnight_deadline.law # §6 Normative Law Example
```

## 🚀 Quick Start

### 1. Create a Governable Span

```typescript
import { createGovernableSpan } from "@/lib/governance";

const span = createGovernableSpan({
  namespace: "contracts",
  tenant_id: "voulezvous",
  app: "example_app",
  resource: {
    type: "deliverable",
    id: "D1",
    deadline_at: "2025-11-15T23:59:59+01:00",
    accepted: false,
    approvals: [],
  },
  who: {
    id: "ops@voulezvous",
    role: "ops",
  },
  timezone: "Europe/Paris",
});

// Span automatically includes:
// - clock.ts, clock.tz (§9 clock_present)
// - trace_id (§13 traceability)
// - idempotency_key (§13 idempotency)
```

### 2. Parse a Law File

```typescript
import { parseLawFile } from "@/lib/governance";

const lawText = `
law midnight_deadline:1.0.0:
  scope: deliverable
  clock: midnight Europe/Paris

  if ok: accepted == true OR approvals.count >= quorum
  then: accept, tag(key=status,val=accepted), append_ledger

  if doubt: now >= deadline_at AND accepted == false AND evidence.missing == true
  then: hold(hours=24), notify(role=ops), tag(key=status,val=under_review), append_ledger

  if not: now >= deadline_at AND accepted == false
  then: terminate(reason=deadline_passed), tag(key=status,val=terminated), append_ledger
`;

const law = parseLawFile(lawText);
```

### 3. Start the Midnight Ruler

```typescript
import { createMidnightRuler } from "@/lib/governance";

const ruler = createMidnightRuler({
  tenant_id: "voulezvous",
  timezone: "Europe/Paris",
  quorum: 2,
  laws: [midnightDeadlineLaw],
});

await ruler.start();
// Scheduler will run daily at 00:00:00 Europe/Paris
```

### 4. Track Metrics

```typescript
import { getMetrics, trackDecision } from "@/lib/governance";

// Automatic tracking
await trackDecision(
  async () => {
    // Your decision logic
  },
  "ok",
  "voulezvous"
);

// Export Prometheus metrics
const metrics = getMetrics();
const prometheus = metrics.exportPrometheus();
console.log(prometheus);
```

## 📊 Constitutional Compliance

### §4 Canonical Data Model

All spans follow the constitutional data structure:

- **GovernableSpan** (input): Activity to be governed
- **LawDecisionSpan** (output): Law engine decision
- **LedgerEvent** (audit): Append-only event record

### §9 Constitutional Invariants

✅ **clock_present**: Every span MUST include `clock.ts` and `clock.tz`  
✅ **who_required**: Every effect MUST include `who.id` and `who.role`  
✅ **quorum_for_accept**: Acceptance MUST verify `approvals.count ≥ tenant.quorum`  
✅ **ledger_required**: Every decision MUST append to ledger  
✅ **traceability**: `links.caused_by` and `trace_id` MUST chain input→decision→effect

### §13 Idempotency & Trace

- `idempotency_key`: Prevents duplicate effects (auto-generated)
- `trace_id`: End-to-end correlation (auto-generated)

### §17 Error Recovery

- **Clock drift > 500ms**: Fail-closed to `doubt`, notify ops
- **Timezone corruption**: Fail-closed, block state transitions
- **Poison inputs**: Skip transitions, emit `doubt`, quarantine
- **Expression errors**: Short-circuit to `doubt`, apply hold(24h)

## 🔐 Integration with LogLineOS Auth

The `lib/auth.ts` module now includes constitutional fields automatically:

```typescript
import { signSpan } from "@/lib/auth";

// Constitutional fields added automatically
const result = await signSpan(apiKey, {
  tenant_id: "voulezvous",
  app: "example_app",
  resource: { type: "contract", id: "C1" },
  who: { id: "user@example.com", role: "admin" },
});

// Result includes:
// - trace_id (auto-generated)
// - idempotency_key (auto-generated)
// - clock.ts, clock.tz (from getCurrentClock)
```

## 📈 Observability (§19)

**Counters:**
- `decisions_total{triage,tenant_id}`
- `actions_total{type,tenant_id}`
- `errors_total{class,tenant_id}`

**Gauges:**
- `decision_latency_ms{tenant_id}`
- `pending_spans{tenant_id}`
- `clock_drift_ms{tenant_id}`

**Histograms:**
- `evaluation_time_ms{tenant_id}` (p50, p95, p99)

## 🧪 Example: Deliverable Governance

```typescript
import {
  createGovernableSpan,
  createMidnightRuler,
  loadLawFile,
} from "@/lib/governance";

// Load midnight_deadline.law
const law = await loadLawFile("/governance/laws/midnight_deadline.law");

// Create ruler for tenant
const ruler = createMidnightRuler({
  tenant_id: "voulezvous",
  timezone: "Europe/Paris",
  quorum: 2,
  laws: [law],
});

// Start daily midnight enforcement
await ruler.start();

// Create a deliverable
const deliverable = createGovernableSpan({
  namespace: "contracts",
  tenant_id: "voulezvous",
  app: "procurement",
  resource: {
    type: "deliverable",
    id: "D001",
    deadline_at: "2025-11-15T23:59:59+01:00",
    accepted: false,
    approvals: [],
    evidence: { missing: false },
  },
  who: { id: "buyer@voulezvous", role: "buyer" },
});

// At midnight (00:00:00 Europe/Paris):
// - If accepted OR approvals >= quorum → ACCEPT
// - If deadline passed + evidence missing → HOLD 24h + notify ops
// - If deadline passed + not accepted → TERMINATE
```

## 🎯 Next Steps

1. **Backend Integration**: Connect to PostgreSQL ledger (append-only)
2. **Email Service**: Implement `notify(role=ops)` action
3. **BLAKE3 Hashing**: Replace placeholder with actual BLAKE3 library
4. **NTP Sync**: Implement real clock drift monitoring
5. **Conformance Tests**: Run §15 tests (AcceptedOk, DoubtEvidenceMissing, NotTerminate)

## 📚 References

- [LogLine Constitution v1.1](https://github.com/danvoulez/LogLine-Ruleset)
- [RFC 2119: Key words for use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [BLAKE3 Cryptographic Hash Function](https://github.com/BLAKE3-team/BLAKE3)

---

**License**: CC BY 4.0 (spec), Apache-2.0 (code)  
**Version**: 1.1.0  
**Status**: Stable  
**Date**: 2025-11-05
