"use client";

import { type HTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
} from "./PixelCard";
import { PixelProgress } from "./PixelProgress";

export type WorkstreamStatus =
  | "pending"
  | "provisioning"
  | "running"
  | "needs_input"
  | "stuck"
  | "stopping"
  | "stopped"
  | "complete"
  | "error"
  | "cancelled";

export interface WorkstreamCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  slug: string;
  projectSlug: string;
  status: WorkstreamStatus;
  currentIteration: number;
  maxIterations: number;
  pendingQuestion?: string | null;
}

const statusConfig: Record<
  WorkstreamStatus,
  { label: string; color: string; variant: "default" | "success" | "warning" | "danger" }
> = {
  pending: { label: "PENDING", color: "text-simpson-white/60", variant: "default" },
  provisioning: { label: "PROVISIONING", color: "text-simpson-blue", variant: "default" },
  running: { label: "RUNNING", color: "text-simpson-green", variant: "success" },
  needs_input: { label: "NEEDS INPUT", color: "text-simpson-yellow", variant: "warning" },
  stuck: { label: "STUCK", color: "text-simpson-red", variant: "danger" },
  stopping: { label: "STOPPING", color: "text-simpson-yellow", variant: "warning" },
  stopped: { label: "STOPPED", color: "text-simpson-white/60", variant: "default" },
  complete: { label: "COMPLETE", color: "text-simpson-green", variant: "success" },
  error: { label: "ERROR", color: "text-simpson-red", variant: "danger" },
  cancelled: { label: "CANCELLED", color: "text-simpson-white/60", variant: "default" },
};

export function WorkstreamCard({
  name,
  slug,
  projectSlug,
  status,
  currentIteration,
  maxIterations,
  pendingQuestion,
  className,
  ...props
}: WorkstreamCardProps) {
  const config = statusConfig[status];
  const isActive = ["running", "provisioning", "needs_input"].includes(status);

  return (
    <Link href={`/projects/${projectSlug}/workstreams/${slug}`}>
      <PixelCard
        variant={isActive ? "elevated" : "default"}
        className={cn(
          "cursor-pointer transition-transform hover:scale-[1.02]",
          className
        )}
        {...props}
      >
        <PixelCardHeader>
          <div className="flex items-center justify-between">
            <PixelCardTitle>{name}</PixelCardTitle>
            <span className={cn("font-pixel text-[8px]", config.color)}>
              {config.label}
            </span>
          </div>
        </PixelCardHeader>

        <PixelCardContent>
          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[8px] text-simpson-white/60">
                PROGRESS
              </span>
              <span className="font-pixel text-[8px] text-simpson-white">
                {currentIteration} / {maxIterations}
              </span>
            </div>
            <PixelProgress
              value={currentIteration}
              max={maxIterations}
              variant={config.variant}
              size="sm"
            />
          </div>

          {/* Pending question indicator */}
          {status === "needs_input" && pendingQuestion && (
            <div className="mt-3 p-2 bg-simpson-yellow/10 border-pixel border-simpson-yellow rounded-pixel">
              <p className="font-pixel text-[8px] text-simpson-yellow">
                WAITING FOR INPUT
              </p>
              <p className="font-pixel-body text-sm text-simpson-white mt-1 line-clamp-2">
                {pendingQuestion}
              </p>
            </div>
          )}
        </PixelCardContent>
      </PixelCard>
    </Link>
  );
}
