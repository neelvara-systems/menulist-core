
"use client";

import { Button } from '@shadcncomponents/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [currentIcon, setCurrentIcon] = useState<'sun' | 'moon'>('sun');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const determineIcon = () => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'moon' : 'sun';
      }
      return theme === 'dark' ? 'moon' : 'sun';
    };

    setCurrentIcon(determineIcon());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setCurrentIcon(mediaQuery.matches ? 'moon' : 'sun');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  if (!mounted) {
    // Render a placeholder or nothing to avoid hydration errors with icon
    return <Button variant="outline" size="icon" className="rounded-full h-10 w-10" disabled />;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full relative w-10 h-10 overflow-hidden border border-transparent hover:bg-accent/50 hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIcon}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute"
          >
            {currentIcon === 'moon' ? (
              <FaMoon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <FaSun className="h-[1.2rem] w-[1.2rem]" />
            )}
          </motion.div>
        </AnimatePresence>
        <span className="sr-only">Toggle theme</span>
      </Button>
    </>
    // <DropdownMenu>
    //   <DropdownMenuTrigger asChild>
    //     <Button
    //       variant="ghost"
    //       size="icon"
    //       className="rounded-full relative w-10 h-10 overflow-hidden border border-transparent hover:bg-accent/50 hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
    //     >
    //       <AnimatePresence initial={false} mode="wait">
    //         <motion.div
    //           key={currentIcon}
    //           initial={{ y: -20, opacity: 0, rotate: -90 }}
    //           animate={{ y: 0, opacity: 1, rotate: 0 }}
    //           exit={{ y: 20, opacity: 0, rotate: 90 }}
    //           transition={{ duration: 0.3, ease: 'easeInOut' }}
    //           className="absolute"
    //         >
    //           {currentIcon === 'moon' ? (
    //             <FaMoon className="h-[1.2rem] w-[1.2rem]" />
    //           ) : (
    //             <FaSun className="h-[1.2rem] w-[1.2rem]" />
    //           )}
    //         </motion.div>
    //       </AnimatePresence>
    //       <span className="sr-only">Toggle theme</span>
    //     </Button>
    //   </DropdownMenuTrigger>
    //   <DropdownMenuContent
    //     align="end"
    //     className="mt-2 w-40 rounded-xl border border-border bg-background/80 p-1 backdrop-blur-lg shadow-xl"
    //   >
    //     <DropdownMenuItem
    //       onClick={() => setTheme('light')}
    //       className={`rounded-md cursor-pointer flex items-center ${theme === 'light' ? 'bg-primary/10 text-primary' : ''
    //         }`}
    //     >
    //       <FaSun className="mr-2 h-4 w-4" />
    //       <span>Light</span>
    //     </DropdownMenuItem>
    //     <DropdownMenuItem
    //       onClick={() => setTheme('dark')}
    //       className={`rounded-md cursor-pointer flex items-center ${theme === 'dark' ? 'bg-primary/10 text-primary' : ''
    //         }`}
    //     >
    //       <FaMoon className="mr-2 h-4 w-4" />
    //       <span>Dark</span>
    //     </DropdownMenuItem>
    //     {/* <DropdownMenuItem
    //       onClick={() => setTheme('system')}
    //       className={`rounded-md cursor-pointer flex items-center ${
    //         theme === 'system' ? 'bg-primary/10 text-primary' : ''
    //       }`}
    //     >
    //       <FaLaptop className="mr-2 h-4 w-4" />
    //       <span>System</span>
    //     </DropdownMenuItem> */}
    //   </DropdownMenuContent>
    // </DropdownMenu>
  );
}
