/**
 * Circuit Breaker Pattern — Channel Manager Channel Sync
 *
 * Prevents cascading failures when an Channel endpoint is down or rate-limiting.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast (cooldown period)
 * - HALF-OPEN: Testing if Channel recovered, one request allowed
 *
 * Usage:
 *   const cb = getCircuitBreaker('booking.com');
 *   if (!cb.canRequest()) return; // fail fast
 *   try { await fetchChannel(); cb.recordSuccess(); }
 *   catch { cb.recordFailure(); }
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStats {
  otaName: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  openedAt: Date | null;
  totalRequests: number;
}

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  openedAt: Date | null;
  totalRequests: number;
}

// ─── Configuration ───────────────────────────────────────────────
const FAILURE_THRESHOLD = 5;        // Consecutive failures before opening
const COOLDOWN_MS = 5 * 60 * 1000;  // 5 minutes before half-open test
const SUCCESS_RESET = 3;            // Consecutive successes to close from half-open

// ─── In-memory store (use Redis in production for multi-instance) ──
const circuits = new Map<string, CircuitEntry>();

function getEntry(otaName: string): CircuitEntry {
  if (!circuits.has(otaName)) {
    circuits.set(otaName, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      totalRequests: 0,
    });
  }
  return circuits.get(otaName)!;
}

/**
 * Check if a request to the Channel should be allowed.
 */
export function canRequest(otaName: string): boolean {
  const entry = getEntry(otaName);
  entry.totalRequests++;

  if (entry.state === 'closed') {
    return true;
  }

  if (entry.state === 'open') {
    const cooldownElapsed = entry.openedAt
      ? Date.now() - entry.openedAt.getTime()
      : Infinity;

    if (cooldownElapsed >= COOLDOWN_MS) {
      // Transition to half-open: allow one test request
      entry.state = 'half-open';
      entry.successes = 0;
      console.log(`[CircuitBreaker] ${otaName}: OPEN → HALF-OPEN (cooldown elapsed)`);
      return true;
    }

    return false; // Still in cooldown
  }

  // half-open: only allow if we haven't already sent a test request
  // (tracked by successes === 0)
  return entry.successes === 0;
}

/**
 * Record a successful request.
 */
export function recordSuccess(otaName: string): void {
  const entry = getEntry(otaName);
  entry.successes++;
  entry.lastSuccess = new Date();

  if (entry.state === 'half-open' && entry.successes >= SUCCESS_RESET) {
    entry.state = 'closed';
    entry.failures = 0;
    entry.openedAt = null;
    console.log(`[CircuitBreaker] ${otaName}: HALF-OPEN → CLOSED (recovered)`);
  }

  if (entry.state === 'closed') {
    // Reset failure counter on success
    entry.failures = 0;
  }
}

/**
 * Record a failed request.
 */
export function recordFailure(otaName: string, error?: string): void {
  const entry = getEntry(otaName);
  entry.failures++;
  entry.lastFailure = new Date();

  if (entry.state === 'half-open') {
    // Test failed, go back to open
    entry.state = 'open';
    entry.openedAt = new Date();
    console.error(`[CircuitBreaker] ${otaName}: HALF-OPEN → OPEN (test failed: ${error})`);
    return;
  }

  if (entry.failures >= FAILURE_THRESHOLD) {
    entry.state = 'open';
    entry.openedAt = new Date();
    console.error(`[CircuitBreaker] ${otaName}: CLOSED → OPEN (${entry.failures} consecutive failures)`);
  }
}

/**
 * Force open the circuit (e.g., on 429 rate limit).
 */
export function forceOpen(otaName: string, reason?: string): void {
  const entry = getEntry(otaName);
  entry.state = 'open';
  entry.openedAt = new Date();
  entry.lastFailure = new Date();
  console.warn(`[CircuitBreaker] ${otaName}: FORCE OPENED (${reason})`);
}

/**
 * Get current stats for monitoring/dashboard.
 */
export function getCircuitStats(otaName: string): CircuitBreakerStats {
  const entry = getEntry(otaName);
  return {
    otaName,
    state: entry.state,
    failures: entry.failures,
    successes: entry.successes,
    lastFailure: entry.lastFailure,
    lastSuccess: entry.lastSuccess,
    openedAt: entry.openedAt,
    totalRequests: entry.totalRequests,
  };
}

/**
 * Get all circuit breaker stats.
 */
export function getAllCircuitStats(): CircuitBreakerStats[] {
  return Array.from(circuits.keys()).map(getCircuitStats);
}

/**
 * Reset a circuit breaker (manual override).
 */
export function resetCircuit(otaName: string): void {
  circuits.delete(otaName);
  console.log(`[CircuitBreaker] ${otaName}: RESET`);
}
