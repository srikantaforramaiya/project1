"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
type ToastContextValue = { push: (message: string, kind?: Toast["kind"]) => void };

const ToastContext = createContext<ToastContextValue>({ push: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`card-elevated flex animate-fade-in items-start gap-2.5 p-3.5 text-sm shadow-lg ${
              t.kind === "success" ? "border-primary/40" : t.kind === "error" ? "border-danger/50" : "border-accent/40"
            }`}
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : t.kind === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            )}
            <span className="flex-1 text-text-primary">{t.message}</span>
            <button
              aria-label="Dismiss notification"
              className="text-text-secondary hover:text-text-primary"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
