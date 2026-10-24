interface AlertProps {
  message: string;
}

export default function Alert({ message }: AlertProps) {
  return (
    <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      {message}
    </div>
  );
}
