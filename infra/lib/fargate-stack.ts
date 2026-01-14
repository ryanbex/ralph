import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface FargateStackProps extends cdk.StackProps {
  environment: string;
  anthropicKeySecret: secretsmanager.ISecret;
}

export class FargateStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly logGroup: logs.LogGroup;
  public readonly repository: ecr.Repository;
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: FargateStackProps) {
    super(scope, id, props);

    const { environment, anthropicKeySecret } = props;
    const isProduction = environment === "prod";

    // VPC with public subnets only (cost optimization for dev)
    this.vpc = new ec2.Vpc(this, "RalphVpc", {
      vpcName: `ralph-${environment}`,
      maxAzs: 2,
      natGateways: 0, // No NAT for cost savings; tasks run in public subnets
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // CloudWatch Log Group for workstream logs
    this.logGroup = new logs.LogGroup(this, "WorkstreamLogs", {
      logGroupName: `/ralph/workstreams/${environment}`,
      retention: isProduction
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // ECR Repository for worker images
    this.repository = new ecr.Repository(this, "WorkerRepository", {
      repositoryName: `ralph-worker-${environment}`,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: !isProduction,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: "Keep only 10 most recent images",
        },
      ],
    });

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, "RalphCluster", {
      clusterName: `ralph-${environment}`,
      vpc: this.vpc,
      containerInsightsV2: isProduction
        ? ecs.ContainerInsights.ENABLED
        : ecs.ContainerInsights.DISABLED,
      enableFargateCapacityProviders: true,
    });

    // Task execution role (for pulling images and pushing logs)
    const executionRole = new iam.Role(this, "TaskExecutionRole", {
      roleName: `ralph-task-execution-${environment}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    // Grant execution role access to pull from ECR
    this.repository.grantPull(executionRole);

    // Task role (for the container itself)
    const taskRole = new iam.Role(this, "TaskRole", {
      roleName: `ralph-task-${environment}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Grant task role access to read secrets
    anthropicKeySecret.grantRead(taskRole);

    // Grant task role access to write logs
    this.logGroup.grantWrite(taskRole);

    // Fargate Task Definition
    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "WorkerTaskDefinition",
      {
        family: `ralph-worker-${environment}`,
        cpu: 1024, // 1 vCPU
        memoryLimitMiB: 2048, // 2 GB
        executionRole,
        taskRole,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      }
    );

    // Container definition
    const container = this.taskDefinition.addContainer("worker", {
      containerName: "ralph-worker",
      image: ecs.ContainerImage.fromEcrRepository(this.repository, "latest"),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: this.logGroup,
        streamPrefix: "worker",
      }),
      environment: {
        RALPH_ENV: environment,
        AWS_REGION: cdk.Stack.of(this).region,
      },
      secrets: {
        ANTHROPIC_API_KEY: ecs.Secret.fromSecretsManager(anthropicKeySecret),
      },
      healthCheck: {
        command: ["CMD-SHELL", "echo healthy || exit 1"],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Security group for Fargate tasks
    const taskSecurityGroup = new ec2.SecurityGroup(this, "TaskSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: `ralph-task-${environment}`,
      description: "Security group for Ralph worker tasks",
      allowAllOutbound: true, // Workers need outbound for GitHub, Anthropic API, etc.
    });

    // Outputs
    new cdk.CfnOutput(this, "ClusterArn", {
      value: this.cluster.clusterArn,
      description: "ECS Cluster ARN",
      exportName: `ralph-cluster-arn-${environment}`,
    });

    new cdk.CfnOutput(this, "TaskDefinitionArn", {
      value: this.taskDefinition.taskDefinitionArn,
      description: "Task Definition ARN",
      exportName: `ralph-task-definition-arn-${environment}`,
    });

    new cdk.CfnOutput(this, "LogGroupName", {
      value: this.logGroup.logGroupName,
      description: "CloudWatch Log Group Name",
      exportName: `ralph-log-group-${environment}`,
    });

    new cdk.CfnOutput(this, "RepositoryUri", {
      value: this.repository.repositoryUri,
      description: "ECR Repository URI",
      exportName: `ralph-repository-uri-${environment}`,
    });

    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      description: "VPC ID",
      exportName: `ralph-vpc-id-${environment}`,
    });

    new cdk.CfnOutput(this, "TaskSecurityGroupId", {
      value: taskSecurityGroup.securityGroupId,
      description: "Task Security Group ID",
      exportName: `ralph-task-sg-${environment}`,
    });
  }
}
