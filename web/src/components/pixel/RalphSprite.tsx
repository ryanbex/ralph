"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type RalphSpriteState =
  | "idle"
  | "thinking"
  | "working"
  | "success"
  | "error"
  | "waiting";

export interface RalphSpriteProps extends HTMLAttributes<HTMLDivElement> {
  state?: RalphSpriteState;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
  sm: "w-8 h-8",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

const stateColors: Record<RalphSpriteState, string> = {
  idle: "bg-simpson-yellow",
  thinking: "bg-simpson-blue",
  working: "bg-simpson-green",
  success: "bg-simpson-green",
  error: "bg-simpson-red",
  waiting: "bg-simpson-yellow/70",
};

const stateAnimations: Record<RalphSpriteState, string> = {
  idle: "",
  thinking: "animate-pixel-bounce",
  working: "animate-pulse",
  success: "",
  error: "animate-pixel-shake",
  waiting: "animate-pixel-blink",
};

export const RalphSprite = forwardRef<HTMLDivElement, RalphSpriteProps>(
  ({ className, state = "idle", size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          sizeStyles[size],
          className
        )}
        role="img"
        aria-label={`Ralph sprite in ${state} state`}
        {...props}
      >
        {/* Placeholder sprite - colored box with simple pixel face */}
        <div
          className={cn(
            "w-full h-full border-pixel border-simpson-brown rounded-pixel",
            "flex items-center justify-center",
            stateColors[state],
            stateAnimations[state]
          )}
        >
          {/* Simple pixel face representation */}
          <div className="relative w-3/4 h-3/4 flex flex-col items-center justify-center gap-1">
            {/* Eyes */}
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 bg-simpson-dark rounded-pixel" />
              <div className="w-1.5 h-1.5 bg-simpson-dark rounded-pixel" />
            </div>
            {/* Mouth - changes based on state */}
            <div
              className={cn(
                "h-1 bg-simpson-dark rounded-pixel mt-1",
                state === "success" && "w-4",
                state === "error" && "w-3 rounded-full",
                state === "thinking" && "w-2",
                state === "working" && "w-3",
                state === "idle" && "w-3",
                state === "waiting" && "w-2 animate-pixel-blink"
              )}
            />
          </div>
        </div>

        {/* State indicator dot */}
        <div
          className={cn(
            "absolute -top-1 -right-1 w-3 h-3 border-2 border-simpson-brown rounded-full",
            stateColors[state]
          )}
        />
      </div>
    );
  }
);

RalphSprite.displayName = "RalphSprite";
