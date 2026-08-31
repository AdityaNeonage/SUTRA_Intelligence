import type { ReactNode } from "react";
import { cx } from "./utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, ariaLabel = "Workspace sections", className }: TabsProps) {
  return (
    <div className={cx("sutra-tabs", className)} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`sutra-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`sutra-tabpanel-${tab.id}`}
            disabled={tab.disabled}
            className={cx("sutra-tab", selected && "is-active")}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="sutra-tab__icon" aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && <span className="sutra-tab__count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
