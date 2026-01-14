#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FargateStack } from "../lib/fargate-stack";
import { WebSocketStack } from "../lib/websocket-stack";
import { SecretsStack } from "../lib/secrets-stack";

const app = new cdk.App();

const env = app.node.tryGetContext("env") || "dev";

const awsEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

const tags = {
  Environment: env,
  Project: "ralph",
  ManagedBy: "cdk",
};

// Secrets stack (needed by Fargate for API keys)
const secretsStack = new SecretsStack(app, `RalphSecrets-${env}`, {
  env: awsEnv,
  tags,
  environment: env,
});

// Fargate stack for worker containers
const fargateStack = new FargateStack(app, `RalphFargate-${env}`, {
  env: awsEnv,
  tags,
  environment: env,
  anthropicKeySecret: secretsStack.anthropicKeySecret,
});

// WebSocket stack for real-time log streaming
const websocketStack = new WebSocketStack(app, `RalphWebSocket-${env}`, {
  env: awsEnv,
  tags,
  environment: env,
  logGroup: fargateStack.logGroup,
});

// Add cross-stack dependencies
fargateStack.addDependency(secretsStack);
websocketStack.addDependency(fargateStack);

app.synth();
