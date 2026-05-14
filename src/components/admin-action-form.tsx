"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/types/tasky";
import { StatusMessage } from "@/components/ui";

type AdminActionFormProps = {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
};

export function AdminActionForm({ action, children, className }: AdminActionFormProps) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);

    startTransition(async () => {
      const result = await action(formData);
      setMessage(result);
    });
  }

  return (
    <form action={handleSubmit} className={className} data-pending={isPending ? "true" : "false"}>
      {children}
      {message ? <StatusMessage message={message.message} tone={message.ok ? "success" : "error"} /> : null}
    </form>
  );
}
