# Ralph Workstream: AWS Infrastructure (CDK)

## Objective
Set up AWS infrastructure using CDK for Ralph Web: Fargate cluster, WebSocket API, CloudWatch logs, and Secrets Manager.

## Context
Ralph Web runs workstreams on AWS Fargate Spot containers. Logs stream to CloudWatch and are pushed to the frontend via API Gateway WebSockets. The technical specification is at `/Users/ryanbeck/.claude/plans/agile-marinating-candy.md`.

Use the **dev AWS environment** for all infrastructure.

## Prerequisites
- web-foundation workstream must be complete
- worker/Dockerfile should exist (or create it)

## Scope

### Include
- Set up AWS CDK v2 in `infra/` directory
- Create Fargate stack:
  - ECS Cluster (ralph-dev)
  - Task definition for worker containers
  - Fargate Spot capacity provider
  - CloudWatch log group (/ralph/workstreams)
- Create WebSocket stack:
  - API Gateway WebSocket API
  - Lambda functions for $connect, $disconnect, sendLogs
  - CloudWatch Logs subscription filter
- Create Secrets stack:
  - Secrets Manager for API keys
- Create shared VPC (or use default)
- IAM roles and policies

### Exclude
- Do NOT deploy to production yet
- Do NOT set up custom domain yet
- Do NOT implement auto-scaling yet

## Deliverables

1. **infra/package.json** - CDK dependencies

2. **infra/cdk.json** - CDK configuration

3. **infra/bin/app.ts** - CDK app entry point

4. **infra/lib/fargate-stack.ts** - Fargate infrastructure:
   ```typescript
   export class FargateStack extends cdk.Stack {
     public readonly cluster: ecs.Cluster
     public readonly taskDefinition: ecs.FargateTaskDefinition
     // ...
   }
   ```

5. **infra/lib/websocket-stack.ts** - WebSocket infrastructure

6. **infra/lib/secrets-stack.ts** - Secrets Manager

7. **worker/Dockerfile** - Worker container image:
   ```dockerfile
   FROM ubuntu:22.04
   RUN apt-get update && apt-get install -y git curl jq nodejs npm
   RUN npm install -g @anthropic-ai/claude-code
   COPY ralph-loop-cloud.sh /usr/local/bin/
   ENTRYPOINT ["/usr/local/bin/ralph-loop-cloud.sh"]
   ```

8. **worker/ralph-loop-cloud.sh** - Cloud-adapted iteration loop

9. **Deploy scripts** in root package.json

## Infrastructure Details

### Fargate Cluster
- Name: ralph-dev
- Capacity: Fargate Spot (cost optimization)
- Task CPU: 1024 (1 vCPU)
- Task Memory: 2048 MB
- Container image: From ECR

### CloudWatch Logs
- Log group: /ralph/workstreams
- Retention: 7 days (dev), 30 days (prod)
- Subscription filter to Lambda

### WebSocket API
- Route: $connect, $disconnect, sendLogs
- Integration: Lambda
- Connection management in DynamoDB (or Redis)

### Secrets Manager
- Secret: ralph/dev/anthropic-keys
- Rotation: Not required (user-provided keys)

## Instructions

1. Check if web-foundation is complete
2. Read PROGRESS.md
3. Pick next task
4. Implement CDK stacks
5. Run `cdk synth` to verify templates
6. Run `cdk deploy --all` to dev environment
7. Update PROGRESS.md
8. If all done, write "## Status: COMPLETE"

## Technical Notes

- Use CDK v2 (not v1)
- TypeScript for CDK code
- Environment: dev (us-east-1)
- All resources should be tagged with Environment=dev
- Use Fargate Spot for cost savings
- Worker container needs: git, curl, jq, nodejs, claude-code CLI
