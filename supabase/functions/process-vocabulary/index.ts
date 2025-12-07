import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAIClient, corsHeaders } from "../_shared/openai-client.ts";
import { eq } from "npm:drizzle-orm@^0.30.0";
import { db, vocabulary } from "@repo/db"; // Mapped to _shared/database.ts

Deno.serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Edge Function 'process-vocabulary' started.");

        // Environment Variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        // DATABASE_URL is initialized in @repo/db

        // Google API Key for Text Generation
        const googleApiKey = req.headers.get("X-OpenAI-Key") || Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("SYSTEM_OPENAI_API_KEY");

        // Config check
        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing Supabase configuration");
        }
        if (!googleApiKey) {
            throw new Error("Missing API Key (Header or Env)");
        }

        // Initialize Supabase (Keep for fetching input for now)
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Parse Request Body
        const { record_id } = await req.json();
        console.log("Received record_id:", record_id);

        if (!record_id) {
            throw new Error("Missing record_id");
        }

        // 2. Fetch the vocabulary record (Using Supabase Client for read)
        const { data: vocab, error: fetchError } = await supabase
            .from("vocabulary")
            .select("*")
            .eq("id", record_id)
            .single();

        if (fetchError || !vocab) {
            console.error("Fetch error:", fetchError);
            throw new Error("Vocabulary not found");
        }
        console.log("Fetched vocabulary:", vocab.term);


        // ==========================================
        // 3. Call Google Gemini Native API
        // ==========================================
        console.log("Calling Google Gemini Native API...");

        const systemPrompt = `
        You are an expert English teacher.
        Given a term, provide the following in JSON format:
        - definition: A concise definition in English.
        - part_of_speech: The part of speech (noun, verb, adjective, etc.).
        - example: A natural example sentence using the term.
        - synonyms: An array of 3-5 synonyms.
        - etymology: A brief explanation of the word's origin.
        - ipa: The International Phonetic Alphabet pronunciation.
        
        Output JSON only. Do not include markdown formatting like \`\`\`json.
        `;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nTerm: ${vocab.term}. Context: ${vocab.source_memo || "None"}` }]
                }
            ],
            generationConfig: {
                response_mime_type: "application/json"
            }
        };

        const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            throw new Error("Invalid Gemini Response: Missing text content");
        }

        const cleanJson = textContent.replace(/```json\n?|```/g, "").trim();
        const content = JSON.parse(cleanJson);

        console.log("Gemini Content Generated:", content.definition);


        // ==========================================
        // 4. Generate Embedding (Using Native Gemini API)
        // ==========================================
        const embeddingModel = "text-embedding-004";
        console.log("Generating Embedding with model:", embeddingModel);

        const embeddingUrl = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${googleApiKey}`;

        const embeddingPayload = {
            model: `models/${embeddingModel}`,
            content: {
                parts: [{ text: `${vocab.term}: ${content.definition}` }]
            }
        };

        const embeddingResponse = await fetch(embeddingUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(embeddingPayload)
        });

        if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Gemini Embedding Error ${embeddingResponse.status}: ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.embedding.values;
        console.log("Embedding generated (Length:", embedding.length, ")");


        // ==========================================
        // 5. Update the database (Using Shared Drizzle Client)
        // ==========================================
        // Drizzle provides type safety and clean syntax
        await db.update(vocabulary)
            .set({
                definition: content.definition,
                part_of_speech: content.part_of_speech,
                example: content.example,
                synonyms: content.synonyms,
                etymology: content.etymology,
                ipa: content.ipa,
                embedding: embedding,
                is_generating: false,
                status: "inputted",
                updated_at: new Date(),
            })
            .where(eq(vocabulary.id, record_id));

        console.log("Database updated successfully via Drizzle.");

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});