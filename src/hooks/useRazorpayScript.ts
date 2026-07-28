import { useState, useEffect } from 'react';
import { isRazorpayCheckoutReady } from '@lib/billing/razorpayScriptBoundary';
import { logPaymentFailure } from './paymentDiagnostics';

const useRazorpayScript = () => {
  const [loaded, setLoaded] = useState(() => (
    typeof window !== 'undefined' && isRazorpayCheckoutReady(window.Razorpay)
  ));

  useEffect(() => {
    const scriptId = 'razorpay-checkout-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    let createdScript = false;

    const handleLoad = () => {
      const isReady = isRazorpayCheckoutReady(window.Razorpay);
      setLoaded(isReady);
      if (!isReady) {
        logPaymentFailure('payment_razorpay_script_loaded_without_checkout');
      }
    };

    const handleError = () => {
      logPaymentFailure('payment_razorpay_script_load_failed');
      setLoaded(false);
    };

    if (isRazorpayCheckoutReady(window.Razorpay)) {
      setLoaded(true);
      return;
    }

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      createdScript = true;
    }

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    if (createdScript) {
      document.body.appendChild(script);
    }

    return () => {
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, []);

  return loaded;
};

export default useRazorpayScript;
