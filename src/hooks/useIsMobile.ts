import { useState, useEffect } from 'react';

const useIsMobile = (maxWidth = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < maxWidth);
    };

    // Check on initial mount
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [maxWidth]);

  return { isMobile, hasMounted };
};

export default useIsMobile;
