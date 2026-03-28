'use client'
import { CLIENT_DASHBOARD_ROUTING } from "@constant/navigations";
import { useClientAuthSession } from "@hook/useClientAuthSession";
import { Button } from "antd";
import { useRouter } from 'next/navigation';
import { LuArrowRight } from "react-icons/lu";

function GetStartedButton() {

    const session = useClientAuthSession();
    const router = useRouter();

    const onClickAction = () => {
        if (session) {
            router.push(CLIENT_DASHBOARD_ROUTING)
        } else {
            router.push("/signin")
        }
    }

    return (
        <Button size="large" type="primary" onClick={onClickAction} icon={<LuArrowRight />}>
            Get Started
        </Button>
    )
}

export default GetStartedButton