/**
 * Operational Infrastructure — Barrel Export
 * 
 * Centralized entry point for all ops utilities.
 * Import from '@lib/ops' for SAFE_MODE checks, types, etc.
 * 
 * @see __docs__/cost-self-protection/
 * @see __docs__/ops-alerting-delivery/
 * @see __docs__/menu-health-monitor/
 * @see __docs__/ops-control-room/
 */

export { checkSafeMode } from './safeMode';
export type {
  AdoptionPulse,
  IntegritySignals,
  OpsAlert,
  OpsConfig,
  StoreHealth,
  SystemState,
} from './types';
