import React from 'react';
import { useAIChat } from '../contexts/AIChatContext';
import GlobalNav, { GlobalNavProps } from './GlobalNav';

export default function GlobalNavWrapper(props: GlobalNavProps) {
  const { chatWidth } = useAIChat();

  return (
    <div
      style={{
        marginRight: chatWidth > 0 ? `${chatWidth}px` : '0',
        transition: 'margin-right 0.3s ease-in-out',
      }}
    >
      <GlobalNav {...props} />
    </div>
  );
}
