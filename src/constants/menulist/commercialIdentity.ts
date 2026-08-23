import { NEELVARA_PRODUCT_NAME } from '@constant/neelvara/product';

export const MENULIST_PRODUCT_NAME = 'MenuList' as const;
export const MENULIST_OPERATING_TRADE_NAME = NEELVARA_PRODUCT_NAME;

export const MENULIST_OPERATOR_DISCLOSURE =
    `${MENULIST_PRODUCT_NAME} is operated by ${MENULIST_OPERATING_TRADE_NAME}.` as const;

export const MENULIST_TRADE_NAME_QUALIFIER =
    `${MENULIST_OPERATING_TRADE_NAME} is the current operating trade name. The verified legal supplier for a purchase appears on the MenuList billing document.` as const;

export const MENULIST_PAYMENT_PROCESSOR_DISCLOSURE =
    'Razorpay processes checkout and payment-method details. MenuList records the payment and prepares the applicable billing document.' as const;
