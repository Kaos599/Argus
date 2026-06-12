"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-argus-primary text-white",
    "hover:bg-argus-primary-hover",
    "active:scale-[0.96]",
    "transition-[background-color,transform]",
    "font-semibold",
  ].join(" "),

  secondary: [
    "bg-argus-bg-elevated text-argus-text",
    "border border-argus-border",
    "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)]",
    "hover:bg-argus-bg-sunken",
    "active:scale-[0.96]",
    "transition-[background-color,transform,box-shadow]",
    "font-medium",
  ].join(" "),

  ghost: [
    "bg-transparent text-argus-text-muted",
    "hover:text-argus-text hover:bg-argus-bg-sunken",
    "active:scale-[0.96]",
    "transition-[background-color,color,transform]",
    "font-medium",
  ].join(" "),

  danger: [
    "bg-argus-danger-bg text-argus-danger",
    "hover:bg-argus-danger/20",
    "active:scale-[0.96]",
    "transition-[background-color,transform]",
    "font-semibold",
  ].join(" "),
};

const sizeClasses: Record<ButtonSize, string> = {
  // sm has reduced visual height but maintains ≥40px hit area via py padding
  sm: "h-9 min-h-[40px] px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-6 text-base",
};

/**
 * Argus design-system Button.
 *
 * - Pills via rounded-full on all variants
 * - No transition-all (specific property transitions only)
 * - active:scale-[0.96] press feedback
 * - focus-visible ring using argus-primary
 * - Accent #00d4aa is never used as a button fill
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Layout
          "inline-flex items-center justify-center gap-2 cursor-pointer",
          // Shape
          "rounded-full",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-primary focus-visible:ring-offset-2",
          // Disabled
          "disabled:opacity-50 disabled:pointer-events-none",
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
