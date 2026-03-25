import React from "react";
import { useToastStore } from "../../store/toastStore.js";
import { X } from "lucide-react";

export default function ToastHost() {
const { items } = useToastStore((s) => s);

  const tone = (type) => {
    if (type === "success") return "border-emerald-500 bg-emerald-50 text-emerald-900";
    if (type === "error") return "border-red-500 bg-red-50 text-red-900";
    if (type === "warn") return "border-orange-500 bg-orange-50 text-orange-900";
    return "border-blue-500 bg-blue-50 text-blue-900";
  };

  const icon = (type) => {
    if (type === "success") return "✓";
    if (type === "error") return "✕";
    if (type === "warn") return "⚠";
    return "ℹ";
  };

  return (
    <div className="fixed right-4 top-4 z-[200] w-full max-w-md space-y-3 pointer-events-none">
      {items.map((t) => (
        <div key={t.id} className={`rounded-xl border-2 p-4 shadow-2xl backdrop-blur-sm animate-slideIn pointer-events-auto ${tone(t.type)}`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl font-bold">{icon(t.type)}</div>
            <div className="flex-1">
              <div className="font-semibold text-base">{t.title}</div>
              {t.message && <div className="text-sm mt-1 opacity-80">{t.message}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}