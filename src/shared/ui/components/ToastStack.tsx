"use client";

import { Toast } from "./Toast";

export type ToastItem = {
  id: string;
  message: string;
  variant?: "success" | "error" | "info";
};

interface ToastStackProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastStack({ toasts, onRemove }: ToastStackProps) {
  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          variant={t.variant}
          onClose={() => onRemove(t.id)}
        />
      ))}
    </div>
  );
}
