# Progress: AWS Infrastructure (CDK)

## Status: COMPLETE

## Completed Tasks
- [x] Verify web-foundation status (not complete, but CDK can be built independently)
- [x] Initialize CDK project in infra/
- [x] Create FargateStack with ECS cluster
- [x] Create task definition for worker
- [x] Set up CloudWatch log group
- [x] Create WebSocketStack with API Gateway
- [x] Create Lambda handlers for WebSocket ($connect, $disconnect, sendLogs)
- [x] Create SecretsStack
- [x] Create worker/Dockerfile
- [x] Create worker/ralph-loop-cloud.sh
- [x] Run cdk synth to verify

## Current Task
All CDK infrastructure is created and synthesizes successfully.

## Remaining Tasks
- [ ] Deploy to dev environment (requires AWS credentials)

## Notes
- web-foundation workstream has not completed the web/ directory yet, but AWS infrastructure can be developed independently
- Using dev AWS environment (us-east-1)
- All stacks synthesize successfully with `cdk synth`

## Files Created

### infra/ Directory
- `package.json` - CDK dependencies
- `cdk.json` - CDK configuration
- `tsconfig.json` - TypeScript configuration
- `bin/app.ts` - CDK app entry point
- `lib/fargate-stack.ts` - ECS Fargate infrastructure
- `lib/websocket-stack.ts` - API Gateway WebSocket infrastructure
- `lib/secrets-stack.ts` - Secrets Manager infrastructure
- `lib/lambda/connect.ts` - WebSocket $connect handler
- `lib/lambda/disconnect.ts` - WebSocket $disconnect handler
- `lib/lambda/sendLogs.ts` - CloudWatch to WebSocket broadcaster

### worker/ Directory
- `Dockerfile` - Worker container image (Ubuntu 22.04 + Node.js 20 + Claude Code)
- `entrypoint.sh` - Container initialization script
- `ralph-loop-cloud.sh` - Cloud-adapted iteration loop

## Infrastructure Summary

### FargateStack (RalphFargate-dev)
- VPC with 2 public subnets (no NAT for cost savings)
- ECS Cluster: `ralph-dev`
- Task Definition: 1 vCPU, 2GB RAM
- ECR Repository: `ralph-worker-dev`
- CloudWatch Log Group: `/ralph/workstreams/dev` (7-day retention)
- Security Group with outbound access

### WebSocketStack (RalphWebSocket-dev)
- API Gateway WebSocket API: `ralph-websocket-dev`
- DynamoDB table for connection tracking: `ralph-ws-connections-dev`
- Lambda functions for $connect, $disconnect, sendLogs
- CloudWatch Logs subscription filter

### SecretsStack (RalphSecrets-dev)
- Secrets Manager secret: `ralph/dev/anthropic-keys`

## Deployment Instructions

```bash
cd infra
npm install
cdk synth                     # Verify templates
cdk deploy --all --context env=dev  # Deploy to dev
```

## Next Steps
1. Set up AWS credentials
2. Deploy CDK stacks to dev environment
3. Build and push worker Docker image to ECR
4. Integrate with web frontend (when web-foundation completes)
