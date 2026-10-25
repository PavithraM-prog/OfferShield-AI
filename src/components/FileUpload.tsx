"use client";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  return (
    <div>
      <label htmlFor="offer-pdf" className="block text-base font-semibold text-slate-800">
        Offer PDF (text-based)
      </label>
      <div className="mt-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/45 p-2 transition-colors hover:border-indigo-300 hover:bg-indigo-50/70">
        <input
          id="offer-pdf"
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            onFileChange(nextFile);
          }}
          disabled={disabled}
          className="block w-full min-w-0 cursor-pointer rounded-xl p-2 text-base text-slate-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-indigo-600 file:to-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white file:shadow-sm hover:file:from-indigo-700 hover:file:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {file ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="min-w-0 break-all">
            Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No file selected. Choose a text-based PDF to extract its text.
        </p>
      )}
    </div>
  );
}
