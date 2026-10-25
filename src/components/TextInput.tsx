"use client";

import { type Ref } from "react";
import { MAX_TEXT_LENGTH } from "@/lib/limits/config";

interface TextInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

export default function TextInput({
  id = "offer-text",
  label,
  value,
  onChange,
  error,
  disabled,
  maxLength = MAX_TEXT_LENGTH,
  rows = 8,
  ref,
}: TextInputProps) {
  const errorId = `${id}-error`;

  return (
    <div className="mt-3">
      <label htmlFor={id} className="block text-base font-semibold text-slate-800">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        className="field-control mt-2 block min-h-32 resize-y p-4 text-base text-slate-900 disabled:bg-slate-100"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-rose-600">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span className="text-sm tabular-nums text-slate-500">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
