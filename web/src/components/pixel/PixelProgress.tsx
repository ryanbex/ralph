"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PixelProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "danger";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  default: "bg-simpson-yellow",
  success: "bg-simpson-green",
  warning: "bg-simpson-yellow",
  danger: "bg-simpson-red",
};

const sizeStyles = {
  sm: "h-3",
  md: "h-5",
  lg: "h-8",
};

export const PixelProgress = forwardRef<HTMLDivElement, PixelProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = "default",
      showLabel = false,
      size = "md",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {/* Progress bar container */}
        <div
          className={cn(
            "w-full border-pixel border-simpson-brown rounded-pixel",
            "bg-simpson-dark overflow-hidden",
            sizeStyles[size]
          )}
        >
          {/* Progress bar fill with stepped pixel effect */}
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              variantStyles[variant],
              // Create stepped pixel appearance
              "relative",
              "after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-50"
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          >
            {/* Inner pixel segments for 8-bit look */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-simpson-brown/30 last:border-r-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Optional label */}
        {showLabel && (
          <div className="mt-1 font-pixel text-[8px] text-simpson-white text-right">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

PixelProgress.displayName = "PixelProgress";
