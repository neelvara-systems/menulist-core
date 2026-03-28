/**
 * Multi-Tenant Module
 * 
 * Exports utilities for domain-based multi-tenancy:
 * - Domain resolution (subdomain vs custom domain vs platform)
 * - Tenant lookup from database
 */

export * from './domainLookup';
export * from './domainResolver';

