/**
 * Nova Salary Portal — Railway Infrastructure as Code
 *
 * Provisions the full stack when applied with the Railway CLI:
 *   railway link
 *   railway config apply
 *
 * After apply, set these secret variables once on web + worker (or as shared vars):
 *   AUTH_SECRET   — 32+ random characters
 *   OTP_PEPPER    — random pepper string
 *   EMAIL_API_KEY — Resend (or other) key; optional while EMAIL_PROVIDER=console
 *   APP_URL       — https://<web public domain> (recommended)
 */
import {
  bucket,
  defineRailway,
  github,
  group,
  postgres,
  preserve,
  project,
  redis,
  service,
} from "railway/iac";

const REPO = "cipherbrainstechnologies/Nova-Companies-Portal";
const BRANCH = "main";

export default defineRailway(() => {
  const db = postgres("postgres");
  const cache = redis("redis");
  const files = bucket("payslip-files", { region: "iad" });

  const appEnv = {
    NODE_ENV: "production",
    SEED_DEV: "0",
    DATABASE_URL: db.env.DATABASE_URL,
    DIRECT_URL: db.env.DATABASE_URL,
    REDIS_URL: cache.env.REDIS_URL,
    S3_ENDPOINT: files.env.ENDPOINT,
    S3_REGION: files.env.REGION,
    S3_BUCKET: files.env.BUCKET,
    S3_ACCESS_KEY_ID: files.env.ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: files.env.SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: "false",
    EMAIL_PROVIDER: "console",
    EMAIL_FROM: "Nova Portal <noreply@example.com>",
    MATCH_AUTO_SELECT_THRESHOLD: "85",
    // Set once in the Railway dashboard (or CLI). Preserved across applies.
    AUTH_SECRET: preserve(),
    OTP_PEPPER: preserve(),
    EMAIL_API_KEY: preserve(),
    APP_URL: preserve(),
    PDF_SIGNING_PRIVATE_KEY: preserve(),
    PDF_SIGNING_CERTIFICATE: preserve(),
  };

  const web = service("web", {
    source: github(REPO, { branch: BRANCH }),
    start: "npm run start",
    preDeploy: "npx prisma migrate deploy",
    healthcheck: "/api/health",
    healthcheckTimeout: 60,
    env: appEnv,
  });

  const worker = service("worker", {
    source: github(REPO, { branch: BRANCH }),
    start: "npm run worker",
    env: appEnv,
  });

  const data = group("Data", [db, cache, files]);
  const app = group("App", [web, worker]);

  return project("nova-companies-portal", {
    resources: [data, app],
  });
});
