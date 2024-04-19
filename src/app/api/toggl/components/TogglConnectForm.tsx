"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";

type Props = {
  initiallyConnected?: boolean;

  onConnected?: () => void;
};

export default function TogglConnectForm({
  initiallyConnected = false,
  onConnected,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(initiallyConnected);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (connected) return;

    setLoading(true);
    setErrorText(null);

    try {
      const res = await fetch("/api/toggl/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to verify token");
      }
      setConnected(true);
      setApiKey("");
      onConnected?.();
    } catch (err: any) {
      setErrorText(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "color-mix(in srgb, var(--color-primary-sage) 20%, white)",
        backgroundColor: "white",
      }}
    >
      {/* Icon bubble like the screenshot */}
      <div className="mb-4">
        <div
          className="inline-flex items-center justify-center rounded-xl p-2 shadow-sm"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-primary-light-green) 30%, white)",
          }}
        >
          <Clock
            className="h-6 w-6"
            style={{ color: "var(--color-primary-deep-brown)" }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Label htmlFor="toggl-api-token" className="sr-only">
            Toggl API key
          </Label>
          <Input
            id="toggl-api-token"
            type="password"
            placeholder="Enter Toggl API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={connected || loading}
            className="rounded-full shadow-sm"
            style={{
              borderColor:
                "color-mix(in srgb, var(--color-primary-sage) 35%, white)",
              color: "var(--color-primary-deep-brown)",
            }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--color-primary-deep-brown)", opacity: 0.6 }}
          >
            Required scopes: <span className="font-medium">read:projects</span>,{" "}
            <span className="font-medium">read:time_entries</span>
          </p>
          {errorText && (
            <p
              className="text-sm"
              style={{ color: "var(--color-primary-brick-red)" }}
            >
              {errorText}
            </p>
          )}
        </div>

        {/* Big rounded button — only two states: not connected vs connected */}
        <Button
          type="submit"
          disabled={connected || loading || apiKey.trim().length < 10}
          className="w-full rounded-[2rem] py-6 text-base"
          style={{
            backgroundColor: connected
              ? "color-mix(in srgb, var(--color-primary-sage) 35%, white)"
              : "var(--color-primary-brick-red)",
            color: "white",
            opacity: loading ? 0.9 : 1,
          }}
        >
          {connected ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Connected
            </span>
          ) : loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying
            </span>
          ) : (
            "Verify"
          )}
        </Button>
      </form>
    </Card>
  );
}
