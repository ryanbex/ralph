"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PixelTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const PixelTextarea = forwardRef<HTMLTextAreaElement, PixelTextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-pixel text-[10px] text-simpson-yellow mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            // Base styles
            "w-full px-3 py-2 min-h-[120px] resize-y",
            "font-pixel-body text-lg text-simpson-white",
            "bg-simpson-dark border-pixel rounded-pixel",
            "border-simpson-brown",
            // Shadow for 8-bit depth
            "shadow-pixel-inset",
            // Focus styles
            "focus:outline-none focus:border-simpson-yellow",
            "focus:ring-2 focus:ring-simpson-yellow/50",
            // Placeholder
            "placeholder:text-simpson-white/40",
            // Disabled state
            "disabled:opacity-50 disabled:cursor-not-allowed",
            // Error state
            error && "border-simpson-red focus:border-simpson-red focus:ring-simpson-red/50",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 font-pixel text-[8px] text-simpson-red">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PixelTextarea.displayName = "PixelTextarea";
