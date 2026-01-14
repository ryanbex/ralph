# Ralph Workstream: web-realtime

## Objective
Implement real-time log streaming from Fargate containers to the web UI via WebSockets.

## Dependencies
**IMPORTANT**: Before starting, check if `web/src/lib/aws/fargate.ts` exists. If not, wait and check again in 30 seconds. The web-fargate workstream must complete first.

## Context
- AWS WebSocket API Gateway is deployed
- CloudWatch receives logs from Fargate containers
- Lambda functions handle WebSocket connections and log forwarding
- Need client-side hook and LogViewer component

## Scope
### Include
- Create `web/src/lib/aws/websocket.ts` - WebSocket client helper
- Create `web/src/hooks/useWorkstreamLogs.ts` - React hook for log streaming
- Create `web/src/components/LogViewer.tsx` - Pixel-themed log display
- Integrate LogViewer into workstream detail page
- Auto-scroll to bottom, timestamps, log levels

### Exclude
- Log persistence/history
- Log search/filtering
- Log export

## Instructions
1. Read PROGRESS.md to see what's already done
2. Check dependency: web/src/lib/aws/fargate.ts must exist
3. Read the WebSocket API endpoint from aws-deploy/PROGRESS.md
4. Create websocket.ts with connection helpers
5. Create useWorkstreamLogs hook
6. Create LogViewer component with pixel styling
7. Add LogViewer to workstream detail page
8. Test with mock data if needed
9. Update PROGRESS.md after each step
10. When complete, write "## Status: COMPLETE" in PROGRESS.md

## Technical Notes
```typescript
// useWorkstreamLogs.ts
export function useWorkstreamLogs(workstreamId: string) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`${WEBSOCKET_URL}?workstreamId=${workstreamId}`);
    ws.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);
    };
    // ...
  }, [workstreamId]);

  return { logs, connected };
}
```

- LogViewer should look like a retro terminal
- Use pixel fonts (VT323) for log text
- Color-code by log level (green=info, yellow=warn, red=error)
- Show connection status indicator

## Constraints
- Follow existing patterns in hooks and components
- Use pixel art theme consistently
- Handle reconnection gracefully
- One logical change per iteration
