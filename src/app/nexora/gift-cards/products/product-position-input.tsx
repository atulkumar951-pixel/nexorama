"use client";

import { useState, useTransition } from "react";
import { updateGiftProductPositionAction } from "@/lib/actions/gift-admin-actions";

export function ProductPositionInput({
  productId,
  currentPosition,
}: {
  productId: string;
  currentPosition: number;
}) {
  const [pos, setPos] = useState(currentPosition === 0 ? "" : String(currentPosition));
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const num = pos === "" ? 0 : Math.max(0, parseInt(pos, 10) || 0);
    startTransition(async () => {
      const res = await updateGiftProductPositionAction(Number(productId), num);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        max="999"
        value={pos}
        onChange={(e) => {
          setPos(e.target.value);
          setSaved(false);
        }}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="Auto"
        title="Homepage position (1 = first, 2 = second... Click outside or press Enter to save)"
        className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        disabled={isPending}
      />
      {saved && <span className="text-xs font-bold text-emerald-600">✓</span>}
    </div>
  );
}
