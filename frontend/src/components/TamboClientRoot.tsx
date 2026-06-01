"use client";

import { TamboProvider, TamboStubProvider } from "@tambo-ai/react";
import { useEffect, useState } from "react";
import { cardComponents } from "@/cards/registry";

const TAMBO_API_KEY = process.env.NEXT_PUBLIC_TAMBO_API_KEY || "";
const TAMBO_URL = process.env.NEXT_PUBLIC_TAMBO_API_URL || "http://localhost:8080";
const USE_MOCK =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ||
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1")) ||
  !TAMBO_API_KEY;

export function TamboClientRoot({ children }: { children: React.ReactNode }) {
  // Read the session token at runtime so userKey follows the user
  // across onboarding → dashboard → chat.
  const [userKey, setUserKey] = useState<string>("demo-user");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.localStorage.getItem("argus-session-token");
    if (t) setUserKey(t);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "argus-session-token" && e.newValue) setUserKey(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (USE_MOCK) {
    return (
      <TamboStubProvider components={cardComponents} userKey={userKey}>
        {children}
      </TamboStubProvider>
    );
  }

  return (
    <TamboProvider
      apiKey={TAMBO_API_KEY}
      tamboUrl={TAMBO_URL}
      userKey={userKey}
      components={cardComponents}
    >
      {children}
    </TamboProvider>
  );
}
