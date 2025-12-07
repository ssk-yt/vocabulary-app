
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

// Helper to get env vars in both Node and Deno
function getEnv(key: string): string | undefined {
    if (typeof Deno !== "undefined") {
        return Deno.env.get(key);
    }
    return process.env[key];
}



console.log("Available Env Keys:", JSON.stringify(Object.keys(Deno.env.toObject())));

const connectionString = getEnv("DATABASE_URL");

if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Please set it via 'supabase secrets set' or in your .env file.");
}

// Fix for Supabase Local Development (Docker networking)
// When running in Edge Runtime (Deno), localhost refers to the container itself.
// We need to point to the host machine (host.docker.internal) to reach the DB.
const resolvedConnectionString = (typeof Deno !== "undefined")
    ? connectionString.replace("127.0.0.1", "host.docker.internal").replace("localhost", "host.docker.internal")
    : connectionString;

console.log("DB Connection Config:");
// Masking the password for security in logs
console.log("Original:", connectionString.replace(/:[^:@]+@/, ":****@"));
console.log("Resolved:", resolvedConnectionString.replace(/:[^:@]+@/, ":****@"));

const client = postgres(resolvedConnectionString, { prepare: false });
export const db = drizzle(client, { schema });

export * from "./schema.ts";
