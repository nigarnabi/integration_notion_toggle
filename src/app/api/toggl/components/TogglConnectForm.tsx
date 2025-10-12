"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function TogglConnectForm() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setloading] = useState(false);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setloading(true);
    setError(false);
    setMsg(null);

    const response = await fetch("/api/toggl/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    setloading(false);
    if (response.ok) {
      setApiKey("");
      setMsg("Toggl connected successfully!");
    } else {
      const text = await response.text();
      setError(true);
      setMsg(text || "An error occurred");
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="toggl-api-token" className="text-sm">
          Toggl API Token
        </Label>
        <Input
          id="toggl-api-token"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your Toggl API token"
          autoComplete="off"
        />
      </div>

      <Button
        type="submit"
        disabled={loading || apiKey.trim().length < 10}
        variant="outline"
        className="rounded-full border-[var(--color-primary-deep-brown)] text-[var(--color-primary-deep-brown)] hover:bg-[var(--color-primary-deep-brown)] hover:text-white transition"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting…
          </span>
        ) : (
          "Test & Connect"
        )}
      </Button>

      {msg && (
        <Alert
          className={error ? "border-destructive/50" : "border-emerald-400/50"}
        >
          <AlertDescription
            className={error ? "text-destructive" : "text-emerald-600"}
          >
            {msg}
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
