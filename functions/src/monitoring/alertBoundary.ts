import { createHash } from 'crypto';

const ALERT_ID_PREFIX = 'alert';

export type AlertCooldownDocumentIds = {
  current: string;
  previous: string;
};

function getAlertIdentityHash(params: {
  tId: string;
  sId: string;
  title: string;
}): string {
  return createHash('sha256')
    .update(JSON.stringify([params.tId, params.sId, params.title]))
    .digest('hex')
    .slice(0, 40);
}

export function getAlertCooldownDocumentIds(params: {
  tId: string;
  sId: string;
  title: string;
  nowMillis: number;
  cooldownMs: number;
}): AlertCooldownDocumentIds {
  if (!Number.isFinite(params.nowMillis) || params.nowMillis < 0) {
    throw new Error('Alert time must be a non-negative finite number');
  }
  if (!Number.isFinite(params.cooldownMs) || params.cooldownMs <= 0) {
    throw new Error('Alert cooldown must be a positive finite number');
  }

  const bucket = Math.floor(params.nowMillis / params.cooldownMs);
  const identity = getAlertIdentityHash(params);
  return {
    current: `${ALERT_ID_PREFIX}_${identity}_${bucket}`,
    previous: `${ALERT_ID_PREFIX}_${identity}_${bucket - 1}`,
  };
}

export function isAlertTimestampWithinCooldown(
  timestampMillis: number | null,
  nowMillis: number,
  cooldownMs: number,
): boolean {
  return timestampMillis !== null
    && Number.isFinite(timestampMillis)
    && timestampMillis <= nowMillis
    && timestampMillis >= nowMillis - cooldownMs;
}
