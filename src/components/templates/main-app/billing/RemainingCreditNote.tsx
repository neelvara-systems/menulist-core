import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { calculateRemainingCredits } from '@util/razorpay';
import { theme, Typography } from 'antd';
const { Paragraph } = Typography;


function RemainingCreditNote({ activeSubscription }: { activeSubscription: FirestoreSubscriptionDoc }) {
    const { token } = theme.useToken();
    const { totalRemainingCredits } = calculateRemainingCredits(activeSubscription);

    return (
        <>
            {totalRemainingCredits ? <Paragraph style={{ fontSize: token.fontSizeLG, marginBottom: 0 }} type='secondary'>
                Your remaining plan value will transfer to your new plan, so you don&apos;t lose anything.
            </Paragraph> : null}
        </>
    )
}

export default RemainingCreditNote
