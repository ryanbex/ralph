import { CloudWatchLogsDecodedData, CloudWatchLogsHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import * as zlib from "zlib";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT!;

// Extract workstream ID from log stream name
// Expected format: worker/<workstreamId>/<taskId>
function extractWorkstreamId(logStreamName: string): string | null {
  const parts = logStreamName.split("/");
  if (parts.length >= 2 && parts[0] === "worker") {
    return parts[1];
  }
  return null;
}

// Get all connections subscribed to a workstream
async function getConnectionsForWorkstream(
  workstreamId: string
): Promise<string[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: CONNECTIONS_TABLE,
        IndexName: "workstream-index",
        KeyConditionExpression: "workstreamId = :wsId",
        ExpressionAttributeValues: {
          ":wsId": workstreamId,
        },
      })
    );

    return (result.Items || []).map((item) => item.connectionId);
  } catch (error) {
    console.error("[QUERY] Error fetching connections:", error);
    return [];
  }
}

// Send message to a WebSocket connection
async function sendToConnection(
  apiClient: ApiGatewayManagementApiClient,
  connectionId: string,
  data: unknown
): Promise<boolean> {
  try {
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      })
    );
    return true;
  } catch (error) {
    if (error instanceof GoneException) {
      // Connection is stale, remove it
      console.log(`[SEND] Stale connection ${connectionId}, removing`);
      await docClient.send(
        new DeleteCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId },
        })
      );
    } else {
      console.error(`[SEND] Error sending to ${connectionId}:`, error);
    }
    return false;
  }
}

export const handler: CloudWatchLogsHandler = async (event) => {
  // Decode and decompress CloudWatch Logs data
  const payload = Buffer.from(event.awslogs.data, "base64");
  const decompressed = zlib.gunzipSync(payload);
  const logData: CloudWatchLogsDecodedData = JSON.parse(
    decompressed.toString("utf-8")
  );

  console.log(
    `[LOGS] Received ${logData.logEvents.length} log events from ${logData.logStream}`
  );

  // Extract workstream ID from log stream name
  const workstreamId = extractWorkstreamId(logData.logStream);
  if (!workstreamId) {
    console.log("[LOGS] Could not extract workstream ID, skipping");
    return;
  }

  // Get connections subscribed to this workstream
  const connectionIds = await getConnectionsForWorkstream(workstreamId);
  if (connectionIds.length === 0) {
    console.log(`[LOGS] No connections for workstream ${workstreamId}`);
    return;
  }

  console.log(
    `[LOGS] Broadcasting to ${connectionIds.length} connections for workstream ${workstreamId}`
  );

  // Initialize API Gateway Management API client
  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: WEBSOCKET_ENDPOINT,
  });

  // Format log events for broadcast
  const logMessages = logData.logEvents.map((event) => ({
    timestamp: event.timestamp,
    message: event.message,
    workstreamId,
    logStream: logData.logStream,
  }));

  // Broadcast to all connected clients
  const sendPromises = connectionIds.map((connectionId) =>
    sendToConnection(apiClient, connectionId, {
      type: "logs",
      workstreamId,
      logs: logMessages,
    })
  );

  const results = await Promise.all(sendPromises);
  const successCount = results.filter(Boolean).length;

  console.log(
    `[LOGS] Sent to ${successCount}/${connectionIds.length} connections`
  );
};
