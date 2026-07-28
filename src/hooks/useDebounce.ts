import { useState, useEffect, useMemo, useRef } from "react";

/**
 * Debounce a value change (e.g., search input)
 * Returns the debounced value after the specified delay
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounceValue(searchQuery, 500);
 */
export function useDebounceValue<T>(value: T, delay: number = 500): T {
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

export function _debounce<TArgs extends unknown[]>(
    func: (...args: TArgs) => void,
    delay = 1000,
): (...args: TArgs) => void {
    // Declare a variable called 'timer' to store the timer ID
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return (...args: TArgs) => {
        // Clear the previous timer to prevent the execution of 'mainFunction'
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}


const useDebounce = (callback: () => void): (() => void) => {
    const ref = useRef<(() => void) | undefined>(undefined);

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
