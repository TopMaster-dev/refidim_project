import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  className?: string;
}

const SIZES = {
  icon: {
    sm: { w: 24, h: 24 },
    md: { w: 32, h: 32 },
    lg: { w: 48, h: 48 },
    xl: { w: 64, h: 64 },
  },
  full: {
    sm: { w: 100, h: 27 },
    md: { w: 140, h: 37 },
    lg: { w: 180, h: 48 },
    xl: { w: 240, h: 64 },
  },
};

export function Logo({
  variant = "full",
  size = "md",
  href = "/",
  className,
}: LogoProps) {
  const { w, h } = SIZES[variant][size];
  const src = variant === "icon" ? "/logo-icon.svg" : "/logo-full.svg";

  const img = (
    <Image
      src={src}
      alt="Refidim"
      width={w}
      height={h}
      priority
      className={cn("select-none", className)}
    />
  );

  if (href === null) return img;
  return (
    <Link href={href} className="inline-flex items-center">
      {img}
    </Link>
  );
}
