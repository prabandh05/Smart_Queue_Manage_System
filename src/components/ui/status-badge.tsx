import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        waiting: "bg-muted text-muted-foreground ring-border",
        serving: "bg-warning text-warning-foreground ring-warning/30",
        completed: "bg-success text-success-foreground ring-success/30",
        priority: "bg-accent text-accent-foreground ring-accent/30",
      },
    },
    defaultVariants: {
      variant: "waiting",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return (
    <div className={cn(statusBadgeVariants({ variant }), className)} {...props} />
  );
}

export { StatusBadge, statusBadgeVariants };