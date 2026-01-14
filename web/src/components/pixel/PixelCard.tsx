"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PixelCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
}

const variantStyles = {
  default: "bg-simpson-dark border-simpson-brown shadow-pixel",
  elevated: "bg-simpson-dark border-simpson-yellow shadow-pixel-yellow",
  outlined: "bg-transparent border-simpson-brown",
};

export const PixelCard = forwardRef<HTMLDivElement, PixelCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "border-pixel rounded-pixel p-4",
          // Variant
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PixelCard.displayName = "PixelCard";

export interface PixelCardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const PixelCardHeader = forwardRef<HTMLDivElement, PixelCardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mb-4 pb-2 border-b-pixel border-simpson-brown",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PixelCardHeader.displayName = "PixelCardHeader";

export interface PixelCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const PixelCardTitle = forwardRef<HTMLHeadingElement, PixelCardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          "font-pixel text-simpson-yellow text-sm",
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

PixelCardTitle.displayName = "PixelCardTitle";

export interface PixelCardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const PixelCardContent = forwardRef<HTMLDivElement, PixelCardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "font-pixel-body text-simpson-white text-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PixelCardContent.displayName = "PixelCardContent";
