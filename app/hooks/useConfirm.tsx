"use client";

import { useCallback, useRef, useState } from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?:
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    message: "",
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        open: true,
        ...options,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setConfirmState({ open: false, message: "" });
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setConfirmState({ open: false, message: "" });
  }, []);

  return {
    confirm,
    confirmState,
    handleConfirm,
    handleCancel,
  };
}
