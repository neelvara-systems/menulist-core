export const buildOwnerBusinessHealthCheckStateKey = (params: {
  checkId: string;
  localDate?: string;
  projectId?: string | null;
  storeId?: string | number | null;
}) => [
  'ownerBusinessHealthCheck',
  params.storeId || 'store',
  params.projectId || 'all',
  params.localDate || 'latest',
  params.checkId,
].join(':');
