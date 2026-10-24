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
  rows,
  ref,
}: TextInputProps) {
  const errorId = `${id}-error`;

  return (
    <div className="mt-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        className="mt-1 block w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 disabled:bg-gray-100"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      <div className="mt-1 flex justify-between">
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span className="text-xs text-gray-500">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
