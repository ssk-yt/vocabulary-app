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
        あなたは、文脈の中で言葉を学ぶのを手助けする、優秀な言語学者および語彙コーチです。
        ユーザーの入力から、学習効果を高めるための詳細な構造化データを抽出・生成することが目的です。

        ルール:
        1. ユーザーの「チャット文脈 (Chat Context)」と「手動入力 (Manual Input)」を分析してください。
        2. 対象となる「単語 (Term)」が指定されていない場合は特定してください。
        3. 文脈に即した最適な「意味 (Definition)」と「品詞 (Part of Speech)」を特定してください。
        4. 正しい発音記号 (IPA) を提供してください。
        5. 記憶の定着を助けるための「語源 (Etymology)」「類義語 (Synonyms)」「コロケーション (Collocations)」を生成してください。
           - 語源は、単語のイメージが湧くような簡潔な解説にしてください。
           - コロケーションは、その単語がよく使われる自然な語の組み合わせを挙げてください。その日本語訳も必ず，英語の後に併記してください．
           - 類義語は、その単語の類似する単語を挙げてください。その日本語訳も必ず，英語の後に併記してください．
        6. 「例文 (Example)」を抽出または生成してください。
           - 文脈自体が例文として使える場合はそれを使用します。
           - 例文のあとには，必ず日本語訳を併記してください。
        7. 解説（意味、語源など）は日本語で出力してください。単語、例文、コロケーションはターゲット言語で出力してください。
        8. 出力は以下のJSON形式のみを返してください。マークダウンは不要です。

        {
            "term": "...",
            "definition": "...",
            "part_of_speech": "...",
            "ipa": "...",
            "example": "...",
            "etymology": "...",
            "synonyms": ["...", ...],
            "collocations": ["...", ...]
        }
        `;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`;

        const userPrompt = `
        Target Term: ${vocab.term}
        
        [Manual Inputs (Review these carefully and preserve them)]
        - Definition: ${vocab.definition || "(Empty)"}
        - Part of Speech: ${vocab.part_of_speech || "(Empty)"}
        - Example: ${vocab.example || "(Empty)"}
        - Synonyms: ${vocab.synonyms?.join(", ") || "(Empty)"}
        - Collocations: ${vocab.collocations?.join(", ") || "(Empty)"}
        - Etymology: ${vocab.etymology || "(Empty)"}
        - IPA: ${vocab.ipa || "(Empty)"}

        Chat Context / Memo:
        """
        ${vocab.source_memo || "None"}
        """

        Instruction: 
        1. "Manual Inputs" に値が入っている項目は、**絶対にその内容を変更せず**、そのまま出力してください。
        2. "(Empty)" または "None" になっている項目、および不足している情報を、文脈に基づいて補完してください。
        `;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
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
                collocations: content.collocations,
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