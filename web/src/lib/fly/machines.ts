/**
 * Fly.io Machines API client for Ralph workstreams
 *
 * Documentation: https://fly.io/docs/machines/api/
 */

const FLY_API_BASE = 'https://api.machines.dev/v1'

export interface MachineConfig {
  workstreamId: string
  promptBlobUrl: string
  progressBlobUrl?: string
  maxIterations: number
  anthropicKey: string
  githubRepoUrl: string
  baseBranch?: string
}

export interface Machine {
  id: string
  name: string
  state: MachineState
  region: string
  created_at: string
  updated_at: string
  config: {
    image: string
    env: Record<string, string>
  }
}

export type MachineState =
  | 'created'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'replacing'
  | 'destroying'
  | 'destroyed'

function getFlyAppName(): string {
  const appName = process.env.FLY_APP_NAME
  if (!appName) {
    throw new Error('FLY_APP_NAME environment variable is not set')
  }
  return appName
}

function getFlyApiToken(): string {
  const token = process.env.FLY_API_TOKEN
  if (!token) {
    throw new Error('FLY_API_TOKEN environment variable is not set')
  }
  return token
}

/**
 * Start a new Fly.io machine for a workstream
 */
export async function startMachine(config: MachineConfig): Promise<Machine> {
  const appName = getFlyAppName()
  const token = getFlyApiToken()

  const response = await fetch(`${FLY_API_BASE}/apps/${appName}/machines`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `ralph-${config.workstreamId.slice(0, 8)}`,
      config: {
        image: `registry.fly.io/${appName}:latest`,
        env: {
          WORKSTREAM_ID: config.workstreamId,
          PROMPT_BLOB_URL: config.promptBlobUrl,
          PROGRESS_BLOB_URL: config.progressBlobUrl || '',
          MAX_ITERATIONS: String(config.maxIterations),
          ANTHROPIC_API_KEY: config.anthropicKey,
          GITHUB_REPO_URL: config.githubRepoUrl,
          BASE_BRANCH: config.baseBranch || 'main',
          RALPH_API_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        guest: {
          cpu_kind: 'shared',
          cpus: 1,
          memory_mb: 2048,
        },
        auto_destroy: true, // Clean up when the process exits
        restart: {
          policy: 'no', // Don't restart - workstreams should complete or fail
        },
      },
      region: process.env.FLY_REGION || 'sjc', // Default to San Jose
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to start machine: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Stop a running machine
 */
export async function stopMachine(machineId: string): Promise<void> {
  const appName = getFlyAppName()
  const token = getFlyApiToken()

  const response = await fetch(
    `${FLY_API_BASE}/apps/${appName}/machines/${machineId}/stop`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to stop machine: ${response.status} ${error}`)
  }
}

/**
 * Get the current status of a machine
 */
export async function getMachine(machineId: string): Promise<Machine> {
  const appName = getFlyAppName()
  const token = getFlyApiToken()

  const response = await fetch(
    `${FLY_API_BASE}/apps/${appName}/machines/${machineId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get machine: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Wait for a machine to reach a specific state
 */
export async function waitForState(
  machineId: string,
  targetState: MachineState,
  timeoutMs: number = 60000
): Promise<Machine> {
  const appName = getFlyAppName()
  const token = getFlyApiToken()

  const response = await fetch(
    `${FLY_API_BASE}/apps/${appName}/machines/${machineId}/wait?state=${targetState}&timeout=${timeoutMs}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to wait for state: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * List all machines in the app
 */
export async function listMachines(): Promise<Machine[]> {
  const appName = getFlyAppName()
  const token = getFlyApiToken()

  const response = await fetch(`${FLY_API_BASE}/apps/${appName}/machines`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list machines: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Destroy a machine (force remove)
 */
export async function destroyMachine(machineId: string): Promise<void> {
  const appName = getFlyAppName()
  const token = getFlyApiToken()

  const response = await fetch(
    `${FLY_API_BASE}/apps/${appName}/machines/${machineId}?force=true`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to destroy machine: ${response.status} ${error}`)
  }
}

/**
 * Map Fly machine state to Ralph workstream status
 */
export function machineStateToWorkstreamStatus(
  state: MachineState
): string {
  switch (state) {
    case 'created':
    case 'starting':
      return 'provisioning'
    case 'started':
      return 'running'
    case 'stopping':
      return 'stopping'
    case 'stopped':
    case 'destroyed':
      return 'stopped'
    case 'replacing':
    case 'destroying':
      return 'stopping'
    default:
      return 'error'
  }
}
