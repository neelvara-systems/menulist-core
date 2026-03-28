import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { calculateRemainingCredits } from '@util/razorpay';
import { theme, Tooltip, Typography } from 'antd';
import { LuInfo } from 'react-icons/lu';
const { Text, Paragraph } = Typography;


function RemainingCreditNote({ activeSubscription }: { activeSubscription: FirestoreSubscriptionDoc }) {
    const { token } = theme.useToken();
    const { unusedThisMonth, monthsRemaining, monthlyCreditsAllowance, totalRemainingCredits } = calculateRemainingCredits(activeSubscription);

    const planName = activeSubscription.planId.charAt(0).toUpperCase() + activeSubscription.planId.slice(1);

    return (
        <>
            {totalRemainingCredits ? <Paragraph style={{ fontSize: token.fontSizeLG, marginBottom: 0 }} type='secondary'>
                Your remaining plan value will transfer to your new plan, so you don&apos;t lose anything.
                <Tooltip title={`Remaining value: ${totalRemainingCredits} units will carry over as top-up balance.`}>
                    <Text strong style={{ cursor: 'pointer', marginLeft: 4 }}><LuInfo style={{ fontSize: 14 }} /></Text>
                </Tooltip>
            </Paragraph> : null}
        </>
    )
}

export default RemainingCreditNote