import { useEffect, useMemo, useRef, useState } from "react";
import { Command, CornerDownLeft, Search } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Modal } from "./Modal";
import { cx } from "./utils";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
  shortcut?: string;
  icon?: ReactNode;
  keywords?: string[];
  disabled?: boolean;
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  onSelect?: (item: CommandPaletteItem) => void;
  title?: string;
  placeholder?: string;
  emptyMessage?: string;
  enableHotkey?: boolean;
}

/**
 * Searchable command surface. The host owns command execution and route changes;
 * this component only handles query, keyboard navigation, and presentation.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  onSelect,
  title = "Command palette",
  placeholder = "Search cases, people, locations, and actions...",
  emptyMessage = "No matching commands or intelligence records.",
  enableHotkey = true,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) => [item.label, item.description, item.group, ...(item.keywords ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery));
  }, [items, query]);

  const selectableItems = useMemo(() => filteredItems.filter((item) => !item.disabled), [filteredItems]);
  const activeItem = selectableItems[activeIndex] ?? selectableItems[0];
  const groupedItems = useMemo(() => {
    const groups = new Map<string, CommandPaletteItem[]>();
    filteredItems.forEach((item) => {
      const group = item.group ?? "Suggestions";
      const current = groups.get(group) ?? [];
      current.push(item);
      groups.set(group, current);
    });
    return [...groups.entries()];
  }, [filteredItems]);

  useEffect(() => {
    if (!enableHotkey) return undefined;
    const handleHotkey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleHotkey);
    return () => window.removeEventListener("keydown", handleHotkey);
  }, [enableHotkey, onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function execute(item?: CommandPaletteItem) {
    if (!item || item.disabled) return;
    item.onSelect?.();
    onSelect?.(item);
    onOpenChange(false);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => selectableItems.length ? (index + 1) % selectableItems.length : 0);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => selectableItems.length ? (index - 1 + selectableItems.length) % selectableItems.length : 0);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      execute(activeItem);
    }
  }

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title={title} size="lg" className="sutra-command-palette">
      <div className="sutra-command-palette__content" onKeyDown={onKeyDown}>
        <div className="sutra-command-palette__search">
          <Search size={18} aria-hidden="true" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label="Search commands" />
          <span className="sutra-command-palette__hotkey"><Command size={11} /> K</span>
        </div>
        <div className="sutra-command-palette__results" role="listbox" aria-label="Available commands">
          {groupedItems.length === 0 ? <p className="sutra-command-palette__empty">{emptyMessage}</p> : groupedItems.map(([group, groupItems]) => (
            <div className="sutra-command-palette__group" key={group}>
              <span>{group}</span>
              {groupItems.map((item) => {
                const index = selectableItems.findIndex((candidate) => candidate.id === item.id);
                const isActive = item.id === activeItem?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={item.disabled}
                    className={cx("sutra-command-palette__item", isActive && "is-active")}
                    onMouseEnter={() => { if (index >= 0) setActiveIndex(index); }}
                    onClick={() => execute(item)}
                  >
                    {item.icon && <span className="sutra-command-palette__icon" aria-hidden="true">{item.icon}</span>}
                    <span className="sutra-command-palette__copy"><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
                    {item.shortcut ? <kbd>{item.shortcut}</kbd> : isActive && <CornerDownLeft size={14} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
