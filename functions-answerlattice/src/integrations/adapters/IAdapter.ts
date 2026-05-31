/**
 * Answerlattice — Integration Adapter Interface
 * 
 * All adapters implement this interface. Stateless.
 * Each adapter handles: payload formatting + delivery.
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.3
 */

export { IIntegrationAdapter, DeliveryResult, AdapterConfig } from '../types';
