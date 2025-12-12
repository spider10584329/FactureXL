import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary ring-primary/20",
        secondary:
          "bg-secondary/10 text-secondary ring-secondary/20",
        success:
          "bg-[#32bbed]/10 text-[#32bbed] ring-[#32bbed]/20",
        danger:
          "bg-[#f20c1f]/10 text-[#f20c1f] ring-[#f20c1f]/20",
        warning:
          "bg-[#ea7005]/10 text-[#ea7005] ring-[#ea7005]/20",
        info:
          "bg-[#3b6ab3]/10 text-[#3b6ab3] ring-[#3b6ab3]/20",
        outline: "text-foreground ring-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
