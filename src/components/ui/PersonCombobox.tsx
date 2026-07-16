"use client";

import { useState } from "react";

export type PickerOption = { id: string; label: string; sub?: string };

// Searchable dropdown for picking a record (student, partner, etc.) by name
// instead of typing a raw ID. Uncontrolled-input pattern: shows the selected
// option's label when closed, and a live-filtered list while typing.
export function PersonCombobox({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: PickerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="relative">
      <input
        required
        value={open ? query : selected?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange("");
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">No matches</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
              >
                {o.label}
                {o.sub && <span className="ml-1 text-xs text-slate-400">{o.sub}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
