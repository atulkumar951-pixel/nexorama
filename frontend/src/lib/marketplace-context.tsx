"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { MarketplaceMode } from "./types";
import { api } from "./api";

interface MarketplaceContextValue {
  mode: MarketplaceMode;
  isGiftMode: boolean;
  isDigitalMode: boolean;
  setMode: (mode: MarketplaceMode) => void;
  loading: boolean;
}

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<MarketplaceMode>("DIGITAL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check local override
    const saved = typeof window !== "undefined" ? localStorage.getItem("mp_mode") : null;
    if (saved === "GIFT_CODES" || saved === "DIGITAL") {
      setModeState(saved);
    }

    // 2. Fetch server default from mode probe
    api<{ mode: MarketplaceMode }>("/api/marketplace-mode")
      .then((res) => {
        if (res?.mode && !saved) {
          setModeState(res.mode);
        }
      })
      .catch(() => {
        // Fallback to default DIGITAL
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const setMode = (newMode: MarketplaceMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("mp_mode", newMode);
    }
  };

  return (
    <MarketplaceContext.Provider
      value={{
        mode,
        isGiftMode: mode === "GIFT_CODES",
        isDigitalMode: mode === "DIGITAL",
        setMode,
        loading,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return ctx;
}
