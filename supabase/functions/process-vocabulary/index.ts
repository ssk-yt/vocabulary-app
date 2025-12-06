import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAIClient, corsHeaders } from "../_shared/openai-client.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Edge Function 'process-vocabulary' started.");

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const openAiBaseUrl = Deno.env.get("OPENAI_BASE_URL");
        const chatModel = Deno.env.get("OPENAI_CHAT_MODEL") || "google/gemini-2.0-flash-exp:free";

        console.log("Config:", {
            supabaseUrl: !!supabaseUrl,
            supabaseKey: !!supabaseKey,
            openAiBaseUrl,
            chatModel
        });

        const supabase = createClient(
            supabaseUrl ?? "",
            supabaseKey ?? ""
        );

        const { record_id } = await req.json();
        console.log("Received record_id:", record_id);

        if (!record_id) {
            throw new Error("Missing record_id");
        }

        // 1. Fetch the vocabulary record
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

        // 2. Call OpenAI to generate content
        const openai = createOpenAIClient(req);

        const systemPrompt = `
      You are an expert English teacher.
      Given a term, provide the following in JSON format:
      - definition: A concise definition in English.
      - part_of_speech: The part of speech (noun, verb, adjective, etc.).
      - example: A natural example sentence using the term.
      - synonyms: An array of 3-5 synonyms.
      - etymology: A brief explanation of the word's origin.
      
      Output JSON only.
    `;

        console.log("Calling OpenAI Chat Completion...");
        const completion = await openai.chat.completions.create({
            model: chatModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Term: ${vocab.term}. Context: ${vocab.source_memo || "None"}` },
            ],
            response_format: { type: "json_object" },
        });

        console.log("OpenAI Response:", completion.choices[0].message.content);
        const content = JSON.parse(completion.choices[0].message.content || "{}");

        // 3. Generate Embedding for the term + definition
        const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small";
        console.log("Generating Embedding with model:", embeddingModel);

        const embeddingResponse = await openai.embeddings.create({
            model: embeddingModel,
            input: `${vocab.term}: ${content.definition}`,
        });

        const embedding = embeddingResponse.data[0].embedding;
        console.log("Embedding generated.");

        // 4. Update the database
        const { error: updateError } = await supabase
            .from("vocabulary")
            .update({
                definition: content.definition,
                part_of_speech: content.part_of_speech,
                example: content.example,
                synonyms: content.synonyms,
                etymology: content.etymology,
                embedding: embedding,
                is_generating: false,
                status: "inputted", // Ready for quiz
            })
            .eq("id", record_id);

        if (updateError) {
            console.error("Update error:", updateError);
            throw updateError;
        }

        console.log("Database updated successfully.");
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
