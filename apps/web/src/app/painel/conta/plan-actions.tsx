"use client";

import { useState, useTransition } from "react";
import type { PlanTier } from "@refidim/shared";
import { Button } from "@/components/ui/button";
import { createCheckoutAction, openCustomerPortalAction } from "./actions";

type Props =
  | { action: "checkout"; plan: PlanTier; disabled?: boolean; disabledLabel?: string }
  | { action: "portal" };

export function PlanActions(props: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (props.action === "portal") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await openCustomerPortalAction();
              if (r?.error) setError(r.error);
            })
          }
          disabled={isPending}
        >
          {isPending ? "Abrindo…" : "Abrir portal de pagamento"}
        </Button>
        {error && <p className="mt-1 text-xs text-danger-700">{error}</p>}
      </>
    );
  }

  return (
    <div className="w-full">
      <Button
        variant={props.disabled ? "outline" : "primary"}
        size="lg"
        className="w-full"
        disabled={props.disabled || isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await createCheckoutAction(props.plan);
            if (r?.error) setError(r.error);
          })
        }
      >
        {props.disabled
          ? (props.disabledLabel ?? "Indisponível")
          : isPending
            ? "Abrindo checkout…"
            : "Assinar"}
      </Button>
      {error && <p className="mt-2 text-xs text-danger-700">{error}</p>}
    </div>
  );
}
