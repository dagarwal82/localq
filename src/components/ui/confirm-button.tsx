import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";

interface ConfirmButtonProps extends ButtonProps {
  onConfirm: () => void | Promise<void>;
  confirmTitle?: string;
  confirmDescription?: string;
}

export function ConfirmButton({
  children,
  onConfirm,
  confirmTitle = "Are you sure?",
  confirmDescription = "This action cannot be undone.",
  ...buttonProps
}: React.PropsWithChildren<ConfirmButtonProps>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setPending(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
          <DialogDescription>{confirmDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={buttonProps.variant === 'destructive' ? 'destructive' : 'default'} onClick={handleConfirm} disabled={pending}>
            {pending ? 'Working...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
