"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PixelButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary: "bg-simpson-yellow text-simpson-dark border-simpson-brown hover:bg-simpson-yellow/90",
  secondary: "bg-simpson-blue text-simpson-dark border-simpson-brown hover:bg-simpson-blue/90",
  danger: "bg-simpson-red text-simpson-white border-simpson-brown hover:bg-simpson-red/90",
  success: "bg-simpson-green text-simpson-dark border-simpson-brown hover:bg-simpson-green/90",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-[8px]",
  md: "px-4 py-2 text-[10px]",
  lg: "px-6 py-3 text-xs",
};

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "font-pixel border-pixel rounded-pixel",
          "inline-flex items-center justify-center",
          // 8-bit shadow and interaction effects
          "shadow-pixel",
          "transition-all duration-100 ease-out",
          "hover:shadow-pixel-hover hover:translate-x-0.5 hover:translate-y-0.5",
          "active:shadow-pixel-active active:translate-x-1 active:translate-y-1",
          // Focus styles
          "focus-visible:outline-4 focus-visible:outline-dashed focus-visible:outline-simpson-yellow focus-visible:outline-offset-2",
          // Disabled state
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-pixel disabled:hover:translate-x-0 disabled:hover:translate-y-0",
          // Variant and size
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PixelButton.displayName = "PixelButton";
