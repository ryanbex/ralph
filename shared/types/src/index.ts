// Shared types for Ralph Web Platform
// Types will be added as features are implemented

export type WorkstreamStatus = "pending" | "running" | "paused" | "completed" | "failed";

export interface Workstream {
  id: string;
  name: string;
  projectId: string;
  status: WorkstreamStatus;
  iteration: number;
  maxIterations: number;
  branch: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  baseBranch: string;
  createdAt: Date;
}
