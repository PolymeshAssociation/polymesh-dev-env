import * as dotenv from "dotenv";

dotenv.config();

const nodeUrl = process.env.NODE_URL || "ws://localhost:9944";
const restApi = process.env.REST_API_URL || "http://localhost:3005";
const vaultUrl = process.env.VAULT_API_URL || "http://localhost:8200";
const vaultTransitPath = process.env.VAULT_TRANSIT_PATH || "/v1/transit";
const vaultToken = process.env.VAULT_TOKEN || "root";
const graphqlUrl = process.env.GRAPHQL_URL || "http://localhost:3000";

const artemisHost = process.env.ARTEMIS_HOST || "localhost";
const artemisUsername = process.env.ARTEMIS_USER_NAME || "artemis";
const artemisPassword = process.env.ARTEMIS_PASSWORD || "artemis";
const artemisPort = process.env.ARTEMIS_PORT || 5672;
/**
 * Set to a truthy value to remove used Vault keys
 */
const deleteUsedKeys = !!process.env.DELETE_USED_KEYS || false;

export const env = {
  nodeUrl,
  restApi,
  vaultUrl,
  vaultToken,
  vaultTransitPath,
  graphqlUrl,
  deleteUsedKeys,
  artemisHost,
  artemisUsername,
  artemisPassword,
  artemisPort,
};
