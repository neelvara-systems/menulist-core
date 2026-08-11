import Razorpay from "razorpay";
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

const keyId = menulistServerEnv.razorpayKeyId;
const keySecret = menulistServerEnv.razorpayKeySecret;

// Ensure environment variables are set, this is a critical check.
if (!keyId || !keySecret) {
  throw new Error(
    "NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID and MENULIST_RAZORPAY_KEY_SECRET must be defined in environment variables."
  );
}

/**
 * Singleton instance of the Razorpay client.
 * Initialized using environment variables.
 */
export const razorpayClient = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});
