import { PropsWithChildren, useEffect, useState } from "react";

const ClientOnlyProvider = ({ children }: PropsWithChildren) => {
    const [clientReady, setClientReady] = useState<boolean>(false);

    useEffect(() => {
        setClientReady(true);
    }, []);

    return clientReady ? <>{children}</> : null;
};

export default ClientOnlyProvider;