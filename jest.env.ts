/* eslint-disable @typescript-eslint/no-unsafe-call */
import { config } from "dotenv";

// Use .env.test by default. Override with DOTENV_CONFIG_PATH if needed.
config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env.test" });

// Optional fallbacks for CI/local
process.env.JIRA_BASE_URL ??= "https://example.atlassian.net";
process.env.JIRA_ACCESS_TOKEN ??= "test-token";
