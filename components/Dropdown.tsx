'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  label: string;
  align?: 'left' | 'right';
  className?: string;
  /** 'dark' matches the v3 sidebar selects. */
  variant?: 'light' | 'dark';
}

export default function Dropdown<T extends string>({ value, options, onChange, label, align = 'left', className = '', variant = 'light' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!open) return show();
        setActive((a) => Math.min(last, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))));
        break;
      case 'Home':
      case 'End':
        if (!open) return;
        e.preventDefault();
        setActive(e.key === 'Home' ? 0 : last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) choose(active);
        else show();
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`flex w-full min-w-[7rem] items-center justify-between gap-2 text-left transition focus:outline-none ${
          variant === 'dark'
            ? `h-[34px] rounded-[5px] border bg-[#112e48] px-2.5 text-[13px] text-[#edf2f5] hover:border-[#84a1b5] focus:border-[#84a1b5] ${open ? 'border-[#84a1b5]' : 'border-[#2c465c]'}`
            : `rounded-[5px] border bg-canvas px-2.5 py-1.5 text-xs font-medium text-[#0a2540] shadow-sm hover:border-[#afbec7] focus:ring-2 focus:ring-[#d9e8ef] ${open ? 'border-[#8caab9] ring-2 ring-[#d9e8ef]' : 'border-[#dfe5e8]'}`
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${variant === 'dark' ? 'text-[#8ca0af]' : 'text-[#53636e]'} ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className={`absolute z-30 mt-1 max-h-60 min-w-full overflow-auto rounded-[7px] border border-[#e1e7ea] bg-canvas p-1 shadow-[0_8px_24px_rgba(10,37,64,0.12)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs ${
                  i === active ? 'bg-[#f3f7f8] text-[#0a2540]' : 'text-[#4a5b66]'
                } ${isSelected ? 'font-semibold text-[#0a2540]' : 'font-medium'}`}
              >
                {o.label}
                {isSelected && (
                  <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-[#0a5c36]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
