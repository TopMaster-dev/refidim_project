import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900",
          "placeholder:text-slate-400 shadow-xs",
          "transition-colors duration-150",
          "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          "file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900",
        "placeholder:text-slate-400 shadow-xs",
        "transition-colors duration-150",
        "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 shadow-xs",
        "transition-colors duration-150",
        "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:16px]",
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";
