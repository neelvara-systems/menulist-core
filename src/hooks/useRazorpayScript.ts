import { useState, useEffect } from 'react';

const useRazorpayScript = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const scriptId = 'razorpay-checkout-script';

    if (document.getElementById(scriptId)) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      setLoaded(true);
    };

    script.onerror = () => {
      console.error('Razorpay Checkout script failed to load.');
      setLoaded(false);
    };

    document.body.appendChild(script);

  }, []);

  return loaded;
};

export default useRazorpayScript;
