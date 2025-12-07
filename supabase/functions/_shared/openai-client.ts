import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

export const createOpenAIClient = (req: Request) => {
    // 1. Try to get key from request header (Client-side encrypted key)
    const authHeader = req.headers.get("X-OpenAI-Key");

    // 2. Fallback to system key (only for admin/background tasks if needed)
    const systemKey = Deno.env.get("SYSTEM_OPENAI_API_KEY");

    const apiKey = authHeader || systemKey;

    if (!apiKey) {
        throw new Error("Missing OpenAI API Key. Please set it in Settings.");
    }

    // 3. Support custom Base URL (e.g. for other providers)
    // Default to OpenRouter if not specified
    const baseURL = Deno.env.get("OPENAI_BASE_URL") || "https://openrouter.ai/api/v1";

    return new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
    });
};

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-openai-key",
};