import {
  APIGatewayProxyWebsocketHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (
  event
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;

  console.log(`[DISCONNECT] connectionId=${connectionId}`);

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: {
          connectionId,
        },
      })
    );

    return {
      statusCode: 200,
      body: "Disconnected",
    };
  } catch (error) {
    console.error("[DISCONNECT] Error:", error);
    return {
      statusCode: 500,
      body: "Failed to disconnect",
    };
  }
};
