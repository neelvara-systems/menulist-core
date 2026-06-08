import { useOwnerBusinessHealthCurrent } from './useOwnerBusinessHealthCurrent';

export function useOwnerBusinessContextPacket(projectId?: string, storeScopeKey?: string | number) {
  const current = useOwnerBusinessHealthCurrent(projectId, storeScopeKey);

  return {
    current: current.current,
    isLoading: current.isLoading,
    error: current.error,
    refresh: current.refresh,
  };
}
