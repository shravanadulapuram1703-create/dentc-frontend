import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AIChatContextType {
  isOpen: boolean;
  isMinimized: boolean;
  chatWidth: number;
  setIsOpen: (open: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Calculate chat width based on state
  const chatWidth = isOpen ? (isMinimized ? 320 : 480) : 0; // 320px minimized, 480px full

  // Update global window property for GlobalNav to access
  useEffect(() => {
    (window as any).__chatWidth__ = chatWidth;
  }, [chatWidth]);

  return (
    <AIChatContext.Provider
      value={{
        isOpen,
        isMinimized,
        chatWidth,
        setIsOpen,
        setIsMinimized,
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat() {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
}
