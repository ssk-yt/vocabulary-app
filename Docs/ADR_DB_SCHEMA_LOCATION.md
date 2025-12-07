# Architecture Decision Record: Database Schema Location

**Date:** 2025-12-08
**Status:** Accepted

## Context
In this Monorepo (Turborepo) project, we use a hybrid environment:
1.  **Node.js**: Used by `apps/web` (Next.js), `packages/db` (Drizzle Kit), and development tools.
2.  **Deno**: Used by `supabase/functions` (Edge Functions).

## Problem
Supabase Edge Functions (Deno) run in an isolated environment that cannot easily resolve local workspace packages managed by `pnpm` (Node.js).
Originally, we considered duplicating or proxying files, but this deviates from standard Monorepo patterns.

## Decision
We adopted the **"Import Map Strategy"**.

1.  **Single Source of Truth**
    *   **Location:** `packages/db/src/schema.ts`
    *   **Reason:** This is the standard location for shared packages in a Monorepo.

2.  **Resolution Mechanism**
    *   **Tool:** `supabase/functions/deno.json` (Import Map)
    *   **Configuration:**
        ```json
        {
          "imports": {
            "drizzle-orm": "npm:drizzle-orm@^0.30.0",
            "@repo/db": "../../packages/db/src/index.ts"
          }
        }
        ```
    *   **Reason:** Deno's Import Map allows us to alias `@repo/db` to the local file path `../../packages/db/src/index.ts`. This enables Edge Functions to import shared code just like Node.js apps, without build steps or file copying.

3.  **Environment Compatibility**
    *   **Modification:** `packages/db/src/index.ts` was made isomorphic to support both `process.env` (Node) and `Deno.env` (Edge) for database connection strings.

## Trade-offs
*   **Pros:**
    *   Cleanest directory structure (Standard Monorepo).
    *   No file duplication.
    *   Code behaves consistently across environments.
*   **Cons:**
    *   Requires Deno-specific configuration (`deno.json`) inside `supabase/functions`.
    *   Shared code must be written in a way that is compatible with both runtimes (e.g., careful with `process`, `fs`, etc.).

## Outcome
We successfully integrated Drizzle ORM into Edge Functions by mapping the local `packages/db` via `deno.json`.
