import { exec } from "@actions/exec";
import * as path from "path";

const ROOT_DIR = path.join(__dirname, "..");
const PATCH_CYPRESS_CONFIG_PATH = path.join(
  ROOT_DIR,
  "actions",
  "patch-cypress-config",
  "dist",
  "index.js"
);

const [INPUT_API_URL = ""] = process.argv.slice(2);

exec("node", [PATCH_CYPRESS_CONFIG_PATH], {
  cwd: ROOT_DIR,
  env: { ...process.env, INPUT_API_URL },
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
