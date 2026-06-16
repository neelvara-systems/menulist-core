'use client'

import TenantsDashboard from "@template/platform/tenants"
import { TenantDataType } from "@type/platform/tenant";
import { useState } from "react";

function Page() {
    const [tenantsList, setTenantsList] = useState<TenantDataType[]>([]);

    return (
        <TenantsDashboard tenantsList={tenantsList} setTenantsList={setTenantsList} />
    )
}

export default Page
