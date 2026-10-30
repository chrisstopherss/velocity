import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  icon?: ReactNode;
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, icon, extra, className = '', children }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-hd">
        <h2 className="panel-title">
          {icon}
          {title}
        </h2>
        {extra ? <span className="panel-extra">{extra}</span> : null}
        <span className="winctl" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </header>
      <div className="panel-bd">{children}</div>
    </section>
  );
}
