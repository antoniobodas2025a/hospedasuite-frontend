/**
 * Channel Alert System — Channel Manager
 *
 * Sends notifications when sync issues occur:
 * - Rate limiting detected
 * - Circuit breaker opened
 * - Sync failure (persistent)
 * - Overbooking risk detected
 *
 * Channels: Email (hotelero), Slack/Discord (equipo interno)
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface ChannelAlert {
  hotelId: string;
  hotelName: string;
  otaName: string;
  severity: AlertSeverity;
  type: 'rate_limited' | 'circuit_opened' | 'sync_failed' | 'overbooking_risk' | 'recovered';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ─── Alert Queue (in-memory, use Redis/Bull in production) ────────
const alertQueue: ChannelAlert[] = [];
const MAX_QUEUE_SIZE = 100;

// ─── Deduplication: prevent spam ──────────────────────────────────
interface AlertCooldown {
  key: string;
  lastSent: Date;
  count: number;
}

const cooldowns = new Map<string, AlertCooldown>();

// Cooldown periods by severity
const COOLDOWN_MS: Record<AlertSeverity, number> = {
  info: 30 * 60 * 1000,     // 30 minutes
  warning: 60 * 60 * 1000,  // 1 hour
  critical: 15 * 60 * 1000, // 15 minutes (urgent but don't spam)
};

// Max alerts per hotel per hour before suppression
const MAX_ALERTS_PER_HOTEL_PER_HOUR = 5;

/**
 * Create a deduplication key for an alert.
 */
function getCooldownKey(alert: ChannelAlert): string {
  return `${alert.hotelId}:${alert.otaName}:${alert.type}`;
}

/**
 * Check if an alert should be suppressed (cooldown or rate limit).
 */
function shouldSuppress(alert: ChannelAlert): boolean {
  const key = getCooldownKey(alert);
  const now = Date.now();

  // Check cooldown
  const existing = cooldowns.get(key);
  if (existing) {
    const elapsed = now - existing.lastSent.getTime();
    const cooldownPeriod = COOLDOWN_MS[alert.severity];

    if (elapsed < cooldownPeriod) {
      existing.count++;
      // Log suppressed alert for monitoring
      console.debug(`[AlertSuppressed] ${key} (${existing.count} suppressed)`);
      return true;
    }
  }

  // Check hourly rate limit per hotel
  const hotelKey = `hotel:${alert.hotelId}:hourly`;
  const hotelCooldown = cooldowns.get(hotelKey);
  if (hotelCooldown && hotelCooldown.count >= MAX_ALERTS_PER_HOTEL_PER_HOUR) {
    const elapsed = now - hotelCooldown.lastSent.getTime();
    if (elapsed < 60 * 60 * 1000) {
      console.warn(`[AlertSuppressed] Hotel ${alert.hotelId} hit hourly limit`);
      return true;
    }
    // Reset hourly counter
    cooldowns.delete(hotelKey);
  }

  return false;
}

/**
 * Record that an alert was sent (for deduplication).
 */
function recordSent(alert: ChannelAlert): void {
  const key = getCooldownKey(alert);
  cooldowns.set(key, {
    key,
    lastSent: new Date(),
    count: 1,
  });

  // Also track hourly hotel count
  const hotelKey = `hotel:${alert.hotelId}:hourly`;
  const existing = cooldowns.get(hotelKey);
  if (existing) {
    existing.count++;
  } else {
    cooldowns.set(hotelKey, {
      key: hotelKey,
      lastSent: new Date(),
      count: 1,
    });
  }
}

// ─── Alert Dispatch ───────────────────────────────────────────────

/**
 * Queue and dispatch an Channel alert.
 * Handles deduplication automatically.
 */
export async function sendChannelAlert(alert: ChannelAlert): Promise<void> {
  // Deduplication check
  if (shouldSuppress(alert)) {
    return;
  }

  alert.timestamp = new Date();

  // Add to queue
  alertQueue.push(alert);
  if (alertQueue.length > MAX_QUEUE_SIZE) {
    alertQueue.shift(); // Remove oldest
  }

  // Record for deduplication
  recordSent(alert);

  // Dispatch based on severity
  try {
    switch (alert.severity) {
      case 'critical':
        await dispatchCritical(alert);
        break;
      case 'warning':
        await dispatchWarning(alert);
        break;
      case 'info':
        await dispatchInfo(alert);
        break;
    }
  } catch (error) {
    // Log but don't throw — alerting should never break the sync
    console.error(`[AlertDispatch] Failed to send alert: ${error}`);
  }
}

/**
 * Critical alerts: both hotelero AND internal team.
 */
async function dispatchCritical(alert: ChannelAlert): Promise<void> {
  console.error(`[Alert:CRITICAL] ${alert.hotelName} — ${alert.otaName}: ${alert.message}`);

  // Parallel dispatch — don't wait for one to finish before starting the other
  await Promise.allSettled([
    sendEmailToHotelier(alert),
    sendInternalNotification(alert),
  ]);
}

/**
 * Warning alerts: hotelero notified, internal team logged.
 */
async function dispatchWarning(alert: ChannelAlert): Promise<void> {
  console.warn(`[Alert:WARNING] ${alert.hotelName} — ${alert.otaName}: ${alert.message}`);

  await sendEmailToHotelier(alert);
}

/**
 * Info alerts: internal log only.
 */
async function dispatchInfo(alert: ChannelAlert): Promise<void> {
  console.info(`[Alert:INFO] ${alert.hotelName} — ${alert.otaName}: ${alert.message}`);
}

// ─── Email to Hotelier ────────────────────────────────────────────

async function sendEmailToHotelier(alert: ChannelAlert): Promise<void> {
  // In production: use Resend, SendGrid, or Supabase Edge Function
  // For now: log the email that would be sent

  const subject = getAlertSubject(alert);
  const body = getAlertEmailBody(alert);

  // TODO: Replace with actual email service
  // await resend.emails.send({
  //   from: 'HospedaSuite <alertas@hospedasuite.com>',
  //   to: hotelEmail, // Fetch from DB
  //   subject,
  //   html: body,
  // });

  console.log(`[EmailQueued] To: hotel ${alert.hotelId} | Subject: ${subject}`);
}

function getAlertSubject(alert: ChannelAlert): string {
  const prefix = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  }[alert.severity];

  const typeLabels: Record<ChannelAlert['type'], string> = {
    rate_limited: 'Rate Limit Detectado',
    circuit_opened: 'Sync Pausado',
    sync_failed: 'Error de Sincronización',
    overbooking_risk: 'Riesgo de Sobreventa',
    recovered: 'Sync Recuperado',
  };

  return `${prefix} ${typeLabels[alert.type]} — ${alert.otaName}`;
}

function getAlertEmailBody(alert: ChannelAlert): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1d1d1f;">HospedaSuite — Channel Manager</h2>
      <p><strong>Hotel:</strong> ${alert.hotelName}</p>
      <p><strong>Channel:</strong> ${alert.otaName}</p>
      <p><strong>Problema:</strong> ${alert.message}</p>
      <p><strong>Hora:</strong> ${alert.timestamp.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="color: #666; font-size: 13px;">
        ${alert.severity === 'critical'
          ? 'Estamos monitoreando activamente. Si el problema persiste más de 30 minutos, nuestro equipo te contactará.'
          : 'Esto es informativo. No se requiere acción inmediata.'}
      </p>
    </div>
  `;
}

// ─── Internal Team Notification ───────────────────────────────────

async function sendInternalNotification(alert: ChannelAlert): Promise<void> {
  // In production: Slack webhook, Discord, or PagerDuty
  const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(`[InternalAlert] No webhook configured. Alert: ${alert.message}`);
    return;
  }

  const color = {
    critical: '#ff3b30',
    warning: '#ff9500',
    info: '#007aff',
  }[alert.severity];

  const payload = {
    attachments: [{
      color,
      title: `Channel Manager Alert — ${alert.otaName}`,
      text: alert.message,
      fields: [
        { title: 'Hotel', value: `${alert.hotelName} (\`${alert.hotelId}\`)`, short: true },
        { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
        { title: 'Type', value: alert.type, short: true },
        { title: 'Time', value: alert.timestamp.toISOString(), short: true },
      ],
      footer: 'HospedaSuite Channel Manager',
    }],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`[InternalAlert] Failed to send: ${error}`);
  }
}

// ─── Alert Helpers ────────────────────────────────────────────────

/**
 * Create a rate limit alert.
 */
export function createRateLimitAlert(
  hotelId: string,
  hotelName: string,
  otaName: string,
  retryAfterSeconds: number
): ChannelAlert {
  return {
    hotelId,
    hotelName,
    otaName,
    severity: 'warning',
    type: 'rate_limited',
    message: `Channel ${otaName} nos rate-limited. Reintentando en ${retryAfterSeconds}s.`,
    timestamp: new Date(),
    metadata: { retryAfterSeconds },
  };
}

/**
 * Create a circuit breaker alert.
 */
export function createCircuitAlert(
  hotelId: string,
  hotelName: string,
  otaName: string,
  state: 'opened' | 'closed' | 'half-open',
  failureCount: number
): ChannelAlert {
  return {
    hotelId,
    hotelName,
    otaName,
    severity: state === 'opened' ? 'critical' : 'info',
    type: state === 'opened' ? 'circuit_opened' : 'recovered',
    message: state === 'opened'
      ? `Circuit breaker OPEN para ${otaName} (${failureCount} fallos consecutivos). Sync pausado 5 min.`
      : `Circuit breaker CLOSED para ${otaName}. Sync recuperado.`,
    timestamp: new Date(),
    metadata: { state, failureCount },
  };
}

/**
 * Create an overbooking risk alert.
 */
export function createOverbookingAlert(
  hotelId: string,
  hotelName: string,
  otaName: string,
  roomId: string,
  conflictDate: string
): ChannelAlert {
  return {
    hotelId,
    hotelName,
    otaName,
    severity: 'critical',
    type: 'overbooking_risk',
    message: `Posible sobreventa: habitación ${roomId} tiene conflicto el ${conflictDate}.`,
    timestamp: new Date(),
    metadata: { roomId, conflictDate },
  };
}

/**
 * Create a sync failure alert.
 */
export function createSyncFailureAlert(
  hotelId: string,
  hotelName: string,
  otaName: string,
  error: string
): ChannelAlert {
  return {
    hotelId,
    hotelName,
    otaName,
    severity: 'warning',
    type: 'sync_failed',
    message: `Error sincronizando con ${otaName}: ${error}`,
    timestamp: new Date(),
    metadata: { error },
  };
}

/**
 * Get recent alerts for dashboard/monitoring.
 */
export function getRecentAlerts(hotelId?: string, limit: number = 20): ChannelAlert[] {
  let alerts = alertQueue;
  if (hotelId) {
    alerts = alerts.filter(a => a.hotelId === hotelId);
  }
  return alerts.slice(-limit).reverse();
}
