'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from "@/context/ThemeContext";

export default function ClientThemeProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // This is to prevent hydration errors
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a placeholder with the same structure during SSR
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>{children}</div>
    );
  }

  return <ThemeProvider>{children}</ThemeProvider>;
} 