import React from 'react';
import { useMessagingContext } from '../contexts/ChatContext';
import GlobalNav, { GlobalNavProps } from './GlobalNav';

export default function GlobalNavWrapper(props: GlobalNavProps) {
  const { chatWidth } = useMessagingContext();

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
