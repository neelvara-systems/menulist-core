import { useState, useEffect, useMemo, useRef } from "react";

/**
 * Debounce a value change (e.g., search input)
 * Returns the debounced value after the specified delay
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounceValue(searchQuery, 500);
 */
export function useDebounceValue(value: any, delay: number = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        // Update debounced value after delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        // Cancel the timeout if value changes (also on delay change or unmount)
        // This is how we prevent debounced value from updating if value is changed
        // within the delay period. Timeout gets cleared and restarted.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Only re-call effect if value or delay changes
    
    return debouncedValue;
}

// export const debounce = (func, timeout = 500) => {
//     let timer;

//     return (...args) => {
//         clearTimeout(timer);
//         const [firstArg, ...otherArgs] = args;
//         timer = setTimeout(
//             func.bind(null, firstArg?.target?.value ?? firstArg, ...otherArgs),
//             timeout,
//         );
//     };
// };

export function _debounce(func, delay = 1000) {
    // Declare a variable called 'timer' to store the timer ID
    let timeout;
    // Return an anonymous function that takes in any number of arguments
    return function (...args) {
        // Clear the previous timer to prevent the execution of 'mainFunction'
        clearTimeout(timeout);
        const context = this;
        // Set a new timer that will execute 'mainFunction' after the specified delay
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


const useDebounce = (callback) => {
    const ref: any = useRef();

    useEffect(() => {
        ref.current = callback;
    }, [callback]);

    const debouncedCallback = useMemo(() => {
        const func = () => {
            ref.current?.();
        };

        return _debounce(func, 500);
    }, []);

    return debouncedCallback;
};
export default useDebounce;
