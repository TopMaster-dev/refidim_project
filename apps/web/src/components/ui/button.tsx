import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg font-medium tracking-tight",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-[0.5px]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Solid azul vibrante — alta visibilidade
        primary:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md ring-1 ring-inset ring-brand-700/10",
        // Gradient para CTAs hero
        gradient:
          "bg-brand-gradient text-white shadow-brand hover:shadow-brand-lg",
        // Slate solid — destaque alternativo
        secondary:
          "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
        // Outline limpo
        outline:
          "border border-slate-200 bg-white text-slate-900 shadow-xs hover:bg-slate-50 hover:border-slate-300",
        // Ghost (terciário)
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        // Destrutivo
        destructive:
          "bg-danger-600 text-white shadow-sm hover:bg-danger-700",
        // Subtle (para itens de tabela)
        subtle:
          "bg-slate-100 text-slate-700 hover:bg-slate-200",
        // Link
        link: "text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        xl: "h-12 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Alias para retrocompatibilidade — "default" mapeia para "primary"
export { buttonVariants };
