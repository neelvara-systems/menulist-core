import Razorpay from "razorpay";

// Ensure environment variables are set, this is a critical check.
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined in environment variables."
  );
}

/**
 * Singleton instance of the Razorpay client.
 * Initialized using environment variables.
 */
export const razorpayClient = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
