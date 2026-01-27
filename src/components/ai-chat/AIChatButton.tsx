import React from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';

interface AIChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

export default function AIChatButton({ onClick, isOpen, unreadCount = 0 }: AIChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-[9998]
        w-14 h-14 sm:w-16 sm:h-16 rounded-full
        bg-gradient-to-br from-[#3A6EA5] to-[#1F3A5F]
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-in-out
        flex items-center justify-center
        group
        ${isOpen ? 'scale-90 opacity-70' : 'scale-100 opacity-100 hover:scale-110'}
      `}
      aria-label="Open AI Chat Assistant"
      title="AI Chat Assistant"
    >
      {/* Sparkles icon for AI */}
      <Sparkles 
        className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" 
        strokeWidth={2.5}
      />
      
      {/* Unread count badge */}
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      
      {/* Pulse animation ring */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full bg-[#3A6EA5] animate-ping opacity-20" />
      )}
    </button>
  );
}
