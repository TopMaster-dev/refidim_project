import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: React.ReactNode;
  accent?: "default" | "brand" | "success" | "warning" | "danger";
  pulse?: boolean;
  className?: string;
}

const ACCENT_BORDER: Record<string, string> = {
  default: "",
  brand: "before:bg-brand-500",
  success: "before:bg-success-500",
  warning: "before:bg-warning-500",
  danger: "before:bg-danger-500",
};

export function Stat({
  label,
  value,
  hint,
  trend,
  trendValue,
  icon,
  accent = "default",
  pulse,
  className,
}: StatProps) {
  const hasAccent = accent !== "default";

  return (
    <div
      className={cn(
        "relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        hasAccent &&
          `before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-r-full ${ACCENT_BORDER[accent]}`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600 truncate">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 tabular tracking-tight">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {(icon || pulse) && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {pulse && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500" />
              </span>
            )}
            {icon && (
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  accent === "brand" && "bg-brand-50 text-brand-600",
                  accent === "success" && "bg-success-50 text-success-600",
                  accent === "warning" && "bg-warning-50 text-warning-600",
                  accent === "danger" && "bg-danger-50 text-danger-600",
                  accent === "default" && "bg-slate-100 text-slate-600"
                )}
              >
                {icon}
              </div>
            )}
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          <span
            className={cn(
              "inline-flex items-center gap-0.5",
              trend === "up" && "text-success-600",
              trend === "down" && "text-danger-600",
              trend === "flat" && "text-slate-500"
            )}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend === "flat" && "→"}
            {trendValue}
          </span>
          <span className="text-slate-400">vs período anterior</span>
        </div>
      )}
    </div>
  );
}
