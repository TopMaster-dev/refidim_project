import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight border",
  {
    variants: {
      variant: {
        neutral: "bg-slate-100 text-slate-700 border-slate-200",
        brand: "bg-brand-50 text-brand-700 border-brand-200",
        success: "bg-success-50 text-success-700 border-success-100",
        warning: "bg-warning-50 text-warning-700 border-warning-100",
        danger: "bg-danger-50 text-danger-700 border-danger-100",
        outline: "bg-white text-slate-700 border-slate-200",
        dark: "bg-slate-900 text-white border-slate-900",
      },
      size: {
        sm: "px-2 py-0.5 text-2xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              variant === "success" && "bg-success-500",
              variant === "warning" && "bg-warning-500",
              variant === "danger" && "bg-danger-500 animate-pulse",
              variant === "brand" && "bg-brand-500",
              variant === "neutral" && "bg-slate-400",
              variant === "dark" && "bg-white",
              variant === "outline" && "bg-slate-400"
            )}
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";
