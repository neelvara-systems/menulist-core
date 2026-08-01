import { RefObject, useEffect, useState } from "react";

const OPTIONS: IntersectionObserverInit = {
    root: null,
    rootMargin: "0px 0px 0px 0px",
    threshold: 0,
};

const useInViewport = (elementRef: RefObject<Element | null>) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (element) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.unobserve(element);
                    }
                });
            }, OPTIONS);
            observer.observe(element);
            return () => observer.disconnect();
        }
    }, [elementRef]);

    return isVisible;
};

export default useInViewport;
