'use client'

import StoresDashboard from "@template/platform/stores"
import { TenantDataType } from "@type/platform/tenant";
import { useState } from "react";

function Page() {
    const [tenantsList, setTenantsList] = useState<TenantDataType[]>([]);

    return (
        <StoresDashboard tenantsList={tenantsList} setTenantsList={setTenantsList} />
    )
}

export default Page
