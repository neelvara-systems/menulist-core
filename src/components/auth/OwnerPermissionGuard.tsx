'use client';

import { getPermissionRequirementForPath, satisfiesPermissionRequirement } from '@lib/permissions/permissionRequirements';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Result } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useContext } from 'react';

type OwnerPermissionGuardProps = {
    children: ReactNode;
};

export default function OwnerPermissionGuard({ children }: OwnerPermissionGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { userPermissions } = useContext(PlatformGlobalDataContext);
    const requirement = getPermissionRequirementForPath(pathname);

    if (!requirement || satisfiesPermissionRequirement(userPermissions, requirement)) {
        return <>{children}</>;
    }

    if (!userPermissions) return null;

    return (
        <Result
            extra={(
                <Button onClick={() => router.push('/help-center')} type="primary">
                    Open help
                </Button>
            )}
            status="403"
            subTitle={`Ask the owner to update your role if you need ${requirement.label.toLowerCase()} access.`}
            title="You do not have access to this page"
        />
    );
}
