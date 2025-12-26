import type { ReactNode } from 'react';
// import { components } from '../../styles/theme';
// import { components } from '../styles/theme.js';
import { components } from "@/styles/theme";



interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, icon }: PageHeaderProps) {
  return (
    <div className={components.pageHeader}>
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h1 className={components.pageHeaderTitle}>{title}</h1>
          {subtitle && <p className={components.pageHeaderSubtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
