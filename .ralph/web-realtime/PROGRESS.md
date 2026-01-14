# Progress: web-realtime

## Status: IN PROGRESS

## Dependencies
- [x] AWS infrastructure complete (WebSocket API Gateway, Lambda handlers, DynamoDB)
- [ ] web-fargate must complete first (fargate.ts not found, but WebSocket can work independently)

## Completed
- [x] Create web/src/lib/aws/websocket.ts - WebSocket client helper
  - RalphWebSocket class with auto-reconnection
  - Connection status types
  - LogLine parsing and formatting
  - Environment variable for WebSocket URL (NEXT_PUBLIC_WEBSOCKET_URL)
- [x] Create web/src/hooks/useWorkstreamLogs.ts - React hook for log streaming
  - Auto-connect on mount
  - Log buffering with max limit
  - Connection/disconnect/clearLogs methods
  - Connection status tracking
- [x] Create web/src/hooks/index.ts - Hooks barrel export
- [x] Create web/src/components/LogViewer.tsx - Pixel-themed log display
  - Retro terminal styling
  - Auto-scroll to bottom
  - Timestamp display
  - Log level color coding (green=info, yellow=warn, red=error, blue=debug)
  - Connection status indicator
  - Line count display

## Current Task
- Wait for workstream detail page to exist, then integrate LogViewer

## Remaining
- [ ] Add LogViewer to workstream detail page (page doesn't exist yet)
- [ ] Test log streaming with real WebSocket connection

## Files Created

### web/src/lib/aws/websocket.ts
WebSocket client helper with:
- `RalphWebSocket` class - manages connection lifecycle
- `LogLine` interface - typed log entries
- `ConnectionStatus` type - connection state tracking
- `getWebSocketUrl()` - reads NEXT_PUBLIC_WEBSOCKET_URL env var
- Auto-reconnection with exponential backoff

### web/src/hooks/useWorkstreamLogs.ts
React hook providing:
- `logs` - array of LogLine entries
- `status` - current connection status
- `connect()` - manually initiate connection
- `disconnect()` - close connection
- `clearLogs()` - clear log buffer

### web/src/components/LogViewer.tsx
Pixel-themed terminal component with:
- Simpsons-inspired color scheme
- Retro terminal header with fake window buttons
- Live connection status indicator
- Color-coded log levels
- Auto-scroll to latest logs
- Line count footer

## Environment Variables Needed
```
NEXT_PUBLIC_WEBSOCKET_URL=wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}
```

## Usage Example
```tsx
import { useWorkstreamLogs } from "@/hooks";
import { LogViewer } from "@/components/LogViewer";

function WorkstreamDetail({ workstreamId }: { workstreamId: string }) {
  const { logs, status } = useWorkstreamLogs(workstreamId);

  return (
    <LogViewer
      logs={logs}
      status={status}
      maxHeight="500px"
      autoScroll
    />
  );
}
```

## Notes
- WebSocket endpoint format: `wss://{apiId}.execute-api.{region}.amazonaws.com/{stage}?workstreamId={id}`
- Connection subscribes to logs for specific workstreamId via query param
- Lambda handlers filter and broadcast logs to appropriate connections
