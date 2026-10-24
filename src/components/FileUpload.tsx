"use client";

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  return (
    <div>
      <label htmlFor="offer-pdf" className="block text-sm font-medium text-gray-900">
        Offer PDF (text-based)
      </label>
      <input
        id="offer-pdf"
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileChange(nextFile);
        }}
        disabled={disabled}
        className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm disabled:bg-gray-100"
      />
      {file ? (
        <p className="mt-2 text-sm text-gray-700">
          Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-500">No file selected.</p>
      )}
    </div>
  );
}
