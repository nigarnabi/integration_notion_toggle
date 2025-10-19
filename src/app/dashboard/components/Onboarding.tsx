"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type StepStatus = "connected" | "not-connected" | "error";

interface Step {
  id: string;
  title: string;
  status: StepStatus;
}

export function OnboardingChecklist(props: {
  hasUserId: boolean;
  hasTogglKey: boolean;
  hasStripeCustomer: boolean;
}) {
  const { hasUserId, hasTogglKey, hasStripeCustomer } = props;
  const [isExpanded, setIsExpanded] = useState(true);

  // 3 steps only: Notion, Toggl, Stripe
  const steps: Step[] = [
    {
      id: "notion",
      title: "Connect Notion",
      status: hasUserId ? "connected" : "not-connected",
    },
    {
      id: "toggl",
      title: "Connect Toggl",
      status: hasTogglKey ? "connected" : "not-connected",
    },
    {
      id: "stripe",
      title: "Subscribe via Stripe",
      status: hasStripeCustomer ? "connected" : "not-connected",
    },
  ];

  const allComplete = steps.every((s) => s.status === "connected");

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "connected":
        return (
          <CheckCircle2
            className="h-5 w-5"
            style={{ color: "var(--color-primary-sage)" }}
          />
        );
      case "not-connected":
        return (
          <AlertCircle
            className="h-5 w-5"
            style={{ color: "var(--color-primary-golden)" }}
          />
        );
      case "error":
        return (
          <XCircle
            className="h-5 w-5"
            style={{ color: "var(--color-primary-brick-red)" }}
          />
        );
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    const styles = {
      connected: {
        bg: "color-mix(in srgb, var(--color-primary-sage) 20%, white)",
        text: "Connected ✅",
      },
      "not-connected": {
        bg: "color-mix(in srgb, var(--color-primary-golden) 20%, white)",
        text: "Not connected ⚠️",
      },
      error: {
        bg: "color-mix(in srgb, var(--color-primary-brick-red) 20%, white)",
        text: "Error ❌",
      },
    };

    return (
      <Badge
        variant="secondary"
        className="rounded-full border-0"
        style={{
          backgroundColor: styles[status].bg,
          color: "var(--color-primary-deep-brown)",
        }}
      >
        {styles[status].text}
      </Badge>
    );
  };

  if (allComplete && !isExpanded) {
    return (
      <Card
        className="cursor-pointer rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
        style={{
          borderColor:
            "color-mix(in srgb, var(--color-primary-sage) 20%, white)",
          backgroundColor:
            "color-mix(in srgb, var(--color-primary-sage) 10%, white)",
        }}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="h-5 w-5"
              style={{ color: "var(--color-primary-sage)" }}
            />
            <span
              className="font-medium"
              style={{ color: "var(--color-primary-deep-brown)" }}
            >
              Setup complete 🎉
            </span>
          </div>
          <ChevronDown
            className="h-5 w-5"
            style={{ color: "var(--color-primary-deep-brown)" }}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "color-mix(in srgb, var(--color-primary-sage) 20%, white)",
        backgroundColor: "white",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--color-primary-deep-brown)" }}
        >
          Setup Progress: {steps.filter((s) => s.status === "connected").length}{" "}
          of {steps.length} steps
        </h2>
        {allComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ color: "var(--color-primary-deep-brown)" }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center justify-between rounded-xl border p-4"
            style={{
              borderColor:
                "color-mix(in srgb, var(--color-primary-sage) 15%, white)",
              backgroundColor:
                "color-mix(in srgb, var(--color-primary-light-green) 8%, white)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-primary-sage)",
                  color: "white",
                }}
              >
                {index + 1}
              </div>
              {getStatusIcon(step.status)}
              <span
                className="font-medium"
                style={{ color: "var(--color-primary-deep-brown)" }}
              >
                {step.title}
              </span>
            </div>
            {getStatusBadge(step.status)}
          </div>
        ))}
      </div>
    </Card>
  );
}
