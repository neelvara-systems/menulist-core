'use client';

import { fetchStaffUsers } from '@lib/staffManagement/client';
import type { StaffUserSummary } from '@lib/staffManagement/types';
import {
    resolvePrintableStaffBadgePeople,
    type PrintableStaffBadgePerson,
} from '@lib/printable-asset-templates/staffBadgePerson';
import type { StoreRoleDataType } from '@type/platform/roles';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

type UsePrintableStaffBadgePeopleParams = {
    canReadStaff: boolean;
    enabled: boolean;
    roles: readonly StoreRoleDataType[];
    setUsersList: Dispatch<SetStateAction<StaffUserSummary[] | null>>;
    storeId?: number | null;
    tenantId?: number | null;
    usersList: StaffUserSummary[] | null;
};

type UsePrintableStaffBadgePeopleResult = {
    error: boolean;
    loading: boolean;
    people: PrintableStaffBadgePerson[];
};

export function usePrintableStaffBadgePeople({
    canReadStaff,
    enabled,
    roles,
    setUsersList,
    storeId,
    tenantId,
    usersList,
}: UsePrintableStaffBadgePeopleParams): UsePrintableStaffBadgePeopleResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const hasScope = Number.isSafeInteger(tenantId) && Number(tenantId) > 0
            && Number.isSafeInteger(storeId) && Number(storeId) > 0;

        if (!enabled || !canReadStaff || !hasScope) {
            setLoading(false);
            setError(false);
            return () => { cancelled = true; };
        }
        if (usersList !== null) {
            setLoading(false);
            return () => { cancelled = true; };
        }

        setLoading(true);
        setError(false);
        fetchStaffUsers(Number(tenantId), Number(storeId))
            .then((response) => {
                if (cancelled) return;
                setUsersList(response.users || []);
            })
            .catch(() => {
                if (cancelled) return;
                setUsersList([]);
                setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [canReadStaff, enabled, setUsersList, storeId, tenantId, usersList]);

    const people = useMemo(() => (
        enabled && canReadStaff && Array.isArray(usersList) && Number.isSafeInteger(storeId)
            ? resolvePrintableStaffBadgePeople(usersList, Number(storeId), roles)
            : []
    ), [canReadStaff, enabled, roles, storeId, usersList]);

    return { error, loading, people };
}
