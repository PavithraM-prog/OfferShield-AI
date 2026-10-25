interface AlertProps {
  message: string;
}

export default function Alert({ message }: AlertProps) {
  return (
    <div
      role="alert"
      className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-base font-medium text-rose-950 shadow-sm"
    >
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700"
        aria-hidden="true"
      >
        !
      </span>
      <span className="min-w-0">{message}</span>
    </div>
  );
}
