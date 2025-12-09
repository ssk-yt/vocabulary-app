
// Edge Functions用のDB接続設定の一元管理をするファイル→nextjs側のDB接続設定はdb/src/index.tsに
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

export const getDb = () => {
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set. Please set it via 'supabase secrets set' or in your .env file.");
    }

    // Fix for Supabase Local Development (Docker networking)
    // When running in Edge Runtime (Deno), localhost refers to the container itself.
    // We need to point to the host machine (host.docker.internal) to reach the DB.
    const resolvedConnectionString = (typeof Deno !== "undefined")
        ? connectionString.replace("127.0.0.1", "host.docker.internal").replace("localhost", "host.docker.internal")
        : connectionString;

    const client = postgres(resolvedConnectionString, { prepare: false });
    return drizzle(client, { schema });
};

// Export schema for type usage
export * from "./schema.ts";
