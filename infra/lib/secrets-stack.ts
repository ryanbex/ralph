import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface SecretsStackProps extends cdk.StackProps {
  environment: string;
}

export class SecretsStack extends cdk.Stack {
  public readonly anthropicKeySecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecretsStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const isProduction = environment === "prod";

    // Secret for Anthropic API keys
    // Note: Individual user keys are stored in the web app database (encrypted)
    // This secret is for a default/fallback key or for system operations
    this.anthropicKeySecret = new secretsmanager.Secret(
      this,
      "AnthropicKeySecret",
      {
        secretName: `ralph/${environment}/anthropic-keys`,
        description: "Anthropic API keys for Ralph workstreams",
        removalPolicy: isProduction
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
        // Generate a placeholder secret structure
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            default_key: "sk-ant-placeholder",
          }),
          generateStringKey: "rotation_token",
        },
      }
    );

    // Outputs
    new cdk.CfnOutput(this, "AnthropicSecretArn", {
      value: this.anthropicKeySecret.secretArn,
      description: "Anthropic API Key Secret ARN",
      exportName: `ralph-anthropic-secret-arn-${environment}`,
    });

    new cdk.CfnOutput(this, "AnthropicSecretName", {
      value: this.anthropicKeySecret.secretName,
      description: "Anthropic API Key Secret Name",
      exportName: `ralph-anthropic-secret-name-${environment}`,
    });
  }
}
