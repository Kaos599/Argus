"use client";

import { TamboProvider, TamboStubProvider } from "@tambo-ai/react";
import { useEffect, useState } from "react";
import { cardComponents } from "@/cards/registry";

const TAMBO_API_KEY = process.env.NEXT_PUBLIC_TAMBO_API_KEY || "";
const TAMBO_URL = process.env.NEXT_PUBLIC_TAMBO_API_URL || "http://localhost:8080";
// Mock mode is an EXPLICIT opt-in only. A missing API key must NOT
// silently fall back to mock — that would mask production misconfig.
const USE_MOCK =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ||
    process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1");

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

  if (!TAMBO_API_KEY) {
    // Loud failure: a missing API key in non-mock mode is a configuration
    // bug, not something to paper over. We log a console.error and render
    // a visible error so the developer can't miss it in dev tools or on
    // screen. The stub provider would also be wrong here (no cards
    // registered) and would make the app look like it works in prod
    // when it actually can't talk to Tambo.
    // eslint-disable-next-line no-console
    console.error(
      "[Argus] NEXT_PUBLIC_TAMBO_API_KEY is missing and USE_MOCK is not enabled. " +
        "TamboProvider cannot start. Set NEXT_PUBLIC_TAMBO_API_KEY, or set " +
        "NEXT_PUBLIC_USE_MOCK_DATA=true for local development.",
    );
    return (
      <div
        role="alert"
        data-testid="tambo-missing-config"
        style={{
          padding: "2rem",
          fontFamily: "monospace",
          color: "#b91c1c",
          background: "#fef2f2",
          border: "1px solid #b91c1c",
          margin: "2rem",
          borderRadius: "8px",
        }}
      >
        <strong>Argus misconfiguration</strong>
        <p>
          NEXT_PUBLIC_TAMBO_API_KEY is not set. TamboProvider cannot start.
        </p>
        <p>
          Set <code>NEXT_PUBLIC_TAMBO_API_KEY</code> in your environment, or set{" "}
          <code>NEXT_PUBLIC_USE_MOCK_DATA=true</code> for local development.
        </p>
      </div>
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
