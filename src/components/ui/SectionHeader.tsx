import type { ReactNode } from 'react';
// import { components } from '../styles/theme.js';
// import { components } from "../styles/theme";
import { components } from "@/styles/theme";



interface SectionHeaderProps {
  title: string;
  actions?: ReactNode;
}

export default function SectionHeader({ title, actions }: SectionHeaderProps) {
  return (
    <div className={components.sectionHeader}>
      <div className="flex items-center justify-between">
        <h3 className={components.sectionHeaderTitle}>{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
