import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 pb-2", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-brand-600 mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-slate-500 text-[15px] max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
