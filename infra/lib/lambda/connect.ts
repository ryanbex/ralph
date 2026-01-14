import {
  APIGatewayProxyWebsocketHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const CONNECTION_TTL_HOURS = 24;

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (
  event
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  const workstreamId =
    event.queryStringParameters?.workstreamId || "default";

  console.log(
    `[CONNECT] connectionId=${connectionId} workstreamId=${workstreamId}`
  );

  try {
    // Calculate TTL (24 hours from now)
    const ttl = Math.floor(Date.now() / 1000) + CONNECTION_TTL_HOURS * 60 * 60;

    await docClient.send(
      new PutCommand({
        TableName: CONNECTIONS_TABLE,
        Item: {
          connectionId,
          workstreamId,
          connectedAt: new Date().toISOString(),
          ttl,
        },
      })
    );

    return {
      statusCode: 200,
      body: "Connected",
    };
  } catch (error) {
    console.error("[CONNECT] Error:", error);
    return {
      statusCode: 500,
      body: "Failed to connect",
    };
  }
};
