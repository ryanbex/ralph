import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as logs_destinations from "aws-cdk-lib/aws-logs-destinations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";

export interface WebSocketStackProps extends cdk.StackProps {
  environment: string;
  logGroup: logs.LogGroup;
}

export class WebSocketStack extends cdk.Stack {
  public readonly webSocketApi: apigatewayv2.WebSocketApi;
  public readonly webSocketStage: apigatewayv2.WebSocketStage;
  public readonly connectionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: WebSocketStackProps) {
    super(scope, id, props);

    const { environment, logGroup } = props;
    const isProduction = environment === "prod";

    // DynamoDB table to track WebSocket connections
    this.connectionsTable = new dynamodb.Table(this, "ConnectionsTable", {
      tableName: `ralph-ws-connections-${environment}`,
      partitionKey: {
        name: "connectionId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    // GSI for looking up connections by workstream ID
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: "workstream-index",
      partitionKey: {
        name: "workstreamId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Common environment variables for Lambda functions
    const lambdaEnvironment = {
      CONNECTIONS_TABLE: this.connectionsTable.tableName,
      ENVIRONMENT: environment,
    };

    // Common bundling options - AWS SDK v3 is included in Lambda runtime
    const bundling = {
      minify: true,
      sourceMap: false,
      target: "node20",
      externalModules: [
        "@aws-sdk/client-dynamodb",
        "@aws-sdk/lib-dynamodb",
        "@aws-sdk/client-apigatewaymanagementapi",
      ],
    };

    // $connect handler
    const connectHandler = new NodejsFunction(this, "ConnectHandler", {
      functionName: `ralph-ws-connect-${environment}`,
      entry: path.join(__dirname, "lambda/connect.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      bundling,
      description: "Handles WebSocket $connect route",
    });

    // $disconnect handler
    const disconnectHandler = new NodejsFunction(this, "DisconnectHandler", {
      functionName: `ralph-ws-disconnect-${environment}`,
      entry: path.join(__dirname, "lambda/disconnect.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      bundling,
      description: "Handles WebSocket $disconnect route",
    });

    // sendLogs handler (receives logs from CloudWatch and broadcasts to clients)
    const sendLogsHandler = new NodejsFunction(this, "SendLogsHandler", {
      functionName: `ralph-ws-sendlogs-${environment}`,
      entry: path.join(__dirname, "lambda/sendLogs.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: lambdaEnvironment,
      bundling,
      description: "Broadcasts logs to connected WebSocket clients",
    });

    // Grant Lambda functions access to DynamoDB
    this.connectionsTable.grantReadWriteData(connectHandler);
    this.connectionsTable.grantReadWriteData(disconnectHandler);
    this.connectionsTable.grantReadWriteData(sendLogsHandler);

    // WebSocket API
    this.webSocketApi = new apigatewayv2.WebSocketApi(this, "WebSocketApi", {
      apiName: `ralph-websocket-${environment}`,
      description: "Ralph real-time log streaming WebSocket API",
      connectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          "ConnectIntegration",
          connectHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          disconnectHandler
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
          "DefaultIntegration",
          sendLogsHandler
        ),
      },
    });

    // WebSocket Stage
    this.webSocketStage = new apigatewayv2.WebSocketStage(
      this,
      "WebSocketStage",
      {
        webSocketApi: this.webSocketApi,
        stageName: environment,
        autoDeploy: true,
      }
    );

    // Grant sendLogs Lambda permission to post to WebSocket connections
    const apiArn = `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.apiId}/${environment}/*`;
    sendLogsHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [apiArn],
      })
    );

    // Add WebSocket endpoint to sendLogs Lambda environment
    sendLogsHandler.addEnvironment(
      "WEBSOCKET_ENDPOINT",
      `https://${this.webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${environment}`
    );

    // CloudWatch Logs subscription filter to trigger sendLogs Lambda
    new logs.SubscriptionFilter(this, "LogSubscriptionFilter", {
      logGroup,
      destination: new logs_destinations.LambdaDestination(sendLogsHandler),
      filterPattern: logs.FilterPattern.allEvents(),
      filterName: `ralph-ws-subscription-${environment}`,
    });

    // Outputs
    new cdk.CfnOutput(this, "WebSocketApiId", {
      value: this.webSocketApi.apiId,
      description: "WebSocket API ID",
      exportName: `ralph-websocket-api-id-${environment}`,
    });

    new cdk.CfnOutput(this, "WebSocketEndpoint", {
      value: `wss://${this.webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${environment}`,
      description: "WebSocket Endpoint URL",
      exportName: `ralph-websocket-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, "ConnectionsTableName", {
      value: this.connectionsTable.tableName,
      description: "DynamoDB Connections Table Name",
      exportName: `ralph-connections-table-${environment}`,
    });
  }
}
