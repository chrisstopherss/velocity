import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption<T> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T | '';
  placeholder?: string;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

interface Position {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

const ROW_HEIGHT = 32;
const MAX_LIST = 260;

export function Select<T extends string | number>({ value, options, onChange, disabled, placeholder }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const startIndex = Math.max(0, selectedIndex);
  const current = options[selectedIndex];

  const openList = () => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const room = window.innerHeight - rect.bottom;
    const needed = Math.min(options.length * ROW_HEIGHT + 8, MAX_LIST);
    const above = room < needed + 8 && rect.top > room;
    setPos({
      left: rect.left,
      width: rect.width,
      ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
    setActive(startIndex);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!list.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const onViewport = (e: Event) => {
      if (e.target instanceof Node && list.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', onViewport);
    window.addEventListener('scroll', onViewport, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', onViewport, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive((i) => Math.min(last, Math.max(0, i + step)));
        return;
      }
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        return;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(last);
        }
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) choose(active);
        else openList();
        return;
      case 'Escape':
        if (open) {
          e.preventDefault();
          close();
        }
        return;
      case 'Tab':
        if (open) setOpen(false);
        return;
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        const letter = e.key.toLowerCase();
        const from = open ? active : startIndex;
        const order = [...options.keys()];
        const next = [...order.slice(from + 1), ...order.slice(0, from + 1)].find((i) =>
          options[i].label.toLowerCase().startsWith(letter),
        );
        if (next === undefined) return;
        if (open) setActive(next);
        else onChange(options[next].value);
      }
    }
  };

  return (
    <span className="select">
      <button
        ref={button}
        type="button"
        className="select-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={current ? undefined : 'select-placeholder'}>{current?.label ?? placeholder ?? ''}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && pos
        ? createPortal(
            <ul
              ref={list}
              id={listId}
              role="listbox"
              className="select-list"
              style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
              onPointerDown={(e) => e.preventDefault()}
            >
              {options.map((o, i) => (
                <li
                  key={String(o.value)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === selectedIndex}
                  className={`select-opt${i === active ? ' active' : ''}${i === selectedIndex ? ' selected' : ''}`}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(i)}
                >
                  {o.label}
                  {i === selectedIndex ? <Check size={14} aria-hidden="true" /> : null}
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </span>
  );
}
