"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SharedDropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  itemClassName?: string;
};

export function SharedDropdown({
  value,
  options,
  onChange,
  placeholder = "Chọn",
  disabled = false,
  className = "",
  menuClassName = "",
  itemClassName = "",
}: SharedDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  return (
    <div ref={wrapperRef} className={`shared-dropdown relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className="shared-dropdown-trigger flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`shared-dropdown-menu absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${menuClassName}`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
              className={`shared-dropdown-item w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                value === option.value
                  ? "shared-dropdown-item--selected bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-50 ${itemClassName}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
