/**
 * LogLine Constitution v1.1 — Metrics & Observability
 * 
 * §19: Engines SHOULD expose:
 * - Counters: decisions_total{triage}, actions_total{type}, errors_total{class}
 * - Gauges: decision_latency_ms, pending_spans, clock_drift_ms
 * - Histograms: evaluation_time_ms
 * - Logs/Traces: include trace_id, decision_id, law/version labels
 */

export interface MetricsCollector {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
}

/**
 * In-memory metrics collector (§19)
 * 
 * Production should use Prometheus, OpenTelemetry, or similar.
 */
export class GovernanceMetrics implements MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * §19: Counters - decisions_total{triage}, actions_total{type}, errors_total{class}
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
  }

  /**
   * §19: Gauges - decision_latency_ms, pending_spans, clock_drift_ms
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * §19: Histograms - evaluation_time_ms
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.buildKey(name, labels);
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.buildKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(
    name: string,
    labels?: Record<string, string>
  ): { count: number; sum: number; avg: number; p50: number; p95: number; p99: number } | null {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key);
    
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;

    return {
      count: values.length,
      sum,
      avg,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    let output = "";

    // Counters
    output += "# HELP decisions_total Total number of law decisions\n";
    output += "# TYPE decisions_total counter\n";
    this.counters.forEach((value, key) => {
      if (key.indexOf("decisions_total") === 0) {
        output += `${key} ${value}\n`;
      }
    });

    output += "# HELP actions_total Total number of actions executed\n";
    output += "# TYPE actions_total counter\n";
    this.counters.forEach((value, key) => {
      if (key.indexOf("actions_total") === 0) {
        output += `${key} ${value}\n`;
      }
    });

    output += "# HELP errors_total Total number of errors\n";
    output += "# TYPE errors_total counter\n";
    this.counters.forEach((value, key) => {
      if (key.indexOf("errors_total") === 0) {
        output += `${key} ${value}\n`;
      }
    });

    // Gauges
    output += "# HELP decision_latency_ms Decision latency in milliseconds\n";
    output += "# TYPE decision_latency_ms gauge\n";
    this.gauges.forEach((value, key) => {
      if (key.indexOf("decision_latency_ms") === 0) {
        output += `${key} ${value}\n`;
      }
    });

    output += "# HELP pending_spans Number of pending spans\n";
    output += "# TYPE pending_spans gauge\n";
    this.gauges.forEach((value, key) => {
      if (key.indexOf("pending_spans") === 0) {
        output += `${key} ${value}\n`;
      }
    });

    output += "# HELP clock_drift_ms Clock drift in milliseconds\n";
    output += "# TYPE clock_drift_ms gauge\n";
    this.gauges.forEach((value, key) => {
      if (key.indexOf("clock_drift_ms") === 0) {
        output += `${key} ${value}\n`;
      }
    });

    return output;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    
    return `${name}{${labelStr}}`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * Global metrics singleton
 */
let globalMetrics: GovernanceMetrics | null = null;

export function getMetrics(): GovernanceMetrics {
  if (!globalMetrics) {
    globalMetrics = new GovernanceMetrics();
  }
  return globalMetrics;
}

/**
 * Helper: Track decision execution time
 */
export function trackDecision<T>(
  fn: () => T | Promise<T>,
  triage: "ok" | "doubt" | "not",
  tenant_id: string
): Promise<T> {
  const metrics = getMetrics();
  const start = Date.now();

  const finish = (result: T) => {
    const duration = Date.now() - start;
    
    metrics.incrementCounter("decisions_total", { triage, tenant_id });
    metrics.recordHistogram("evaluation_time_ms", duration, { tenant_id });
    metrics.setGauge("decision_latency_ms", duration, { tenant_id });
    
    return result;
  };

  const result = fn();
  
  if (result instanceof Promise) {
    return result.then(finish);
  }
  
  return Promise.resolve(finish(result));
}

/**
 * Helper: Track action execution
 */
export function trackAction(
  actionType: string,
  tenant_id: string
): void {
  const metrics = getMetrics();
  metrics.incrementCounter("actions_total", { type: actionType, tenant_id });
}

/**
 * Helper: Track error
 */
export function trackError(
  errorClass: string,
  tenant_id: string
): void {
  const metrics = getMetrics();
  metrics.incrementCounter("errors_total", { class: errorClass, tenant_id });
}

/**
 * Helper: Track clock drift
 */
export function trackClockDrift(
  driftMs: number,
  tenant_id: string
): void {
  const metrics = getMetrics();
  metrics.setGauge("clock_drift_ms", driftMs, { tenant_id });
}
