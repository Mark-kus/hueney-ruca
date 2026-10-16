import { spawnSync } from "node:child_process";
import { checkEnv } from "./check-env.mjs";

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (res.error) {
    console.error(`\nNo se pudo ejecutar "${cmd}": ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const { ok, missing, warnings } = checkEnv("migrate");
if (warnings.length) console.log(`\n[db] opcionales sin definir:\n${warnings.join("\n")}`);
if (!ok) {
  console.error(`\n[db] FALTAN VARIABLES:\n${missing.join("\n")}\n`);
  process.exit(1);
}

const ref = process.env.SUPABASE_PROJECT_REF;
const linkArgs = ["link", "--project-ref", ref];
if (process.env.SUPABASE_DB_URL) {
  linkArgs.push("--db-url", process.env.SUPABASE_DB_URL);
} else if (process.env.SUPABASE_DB_PASSWORD) {
  linkArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
}

const cli = process.platform === "win32" ? "supabase.cmd" : "supabase";

run(cli, linkArgs);
run(cli, ["db", "push"]);

console.log("\n[db] migraciones aplicadas OK\n");
