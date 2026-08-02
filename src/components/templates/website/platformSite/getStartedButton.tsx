'use client'
import { DASHBOARD_URL, SIGNIN_URL } from "@constant/urls";
import { useClientAuthSession } from "@hook/useClientAuthSession";
import { Button } from "antd";
import { LuArrowRight } from "react-icons/lu";

function GetStartedButton() {

    const session = useClientAuthSession();

    const onClickAction = () => {
        window.location.assign(session ? DASHBOARD_URL : SIGNIN_URL);
    }

    return (
        <Button size="large" type="primary" onClick={onClickAction} icon={<LuArrowRight />}>
            Get Started
        </Button>
    )
}

export default GetStartedButton
