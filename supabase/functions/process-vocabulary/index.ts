console.log("Process-vocabulary module loading...");
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAIClient, corsHeaders } from "../_shared/openai-client.ts";
import { eq } from "drizzle-orm";
import { getDb, vocabulary } from "../_shared/database.ts";

Deno.serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    let record_id: string | null = null;

    try {
        console.log("Edge Function 'process-vocabulary' started.");

        // Environment Variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        // Google API Key for Text Generation
        const googleApiKey = req.headers.get("X-OpenAI-Key") || Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("SYSTEM_OPENAI_API_KEY");

        // Config check
        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing Supabase configuration");
        }
        if (!googleApiKey) {
            throw new Error("Missing API Key (Header or Env)");
        }

        // Initialize DB (Lazy load to catch config errors here)
        // This usually throws if DATABASE_URL is missing
        const db = getDb();

        // Initialize Supabase (Keep for fetching input for now)
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Parse Request Body
        const body = await req.json();
        record_id = body.record_id;
        const { chat_context, mode = "register" } = body;

        console.log(`Received Request - Record: ${record_id}, Mode: ${mode}`);

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

        let systemPrompt = "";

        if (mode === "edit") {
            // =========================
            // EDIT MODE PROMPT
            // =========================
            systemPrompt = `
            あなたは優秀な語彙編集アシスタントです。
            ユーザーの指示に基づいて、既存の単語データの**必要なフィールドのみ**を修正してください。

            ルール:
            1. ユーザーの指示 ("User Context & Instructions") を分析し、どのフィールドを変更すべきか判断してください。
            2. **変更が必要なフィールドのみ**を含むJSONオブジェクトを返してください。
            3. 手動入力 ("Manual Inputs") は、ユーザーが明示的に変更を指示しない限り、現在の値を尊重してください。
            4. 変更がないフィールドはJSONに含めないでください。
            5. 出力は以下のJSON形式（の部分集合）のみを返してください。

            Possible Fields (JSON Schema):
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
        } else if (mode === "predict") {
            // =========================
            // PREDICT MODE PROMPT
            // =========================
            systemPrompt = `
            あなたは優秀な語彙編集アシスタントです。
            ユーザーの指示に基づいて、既存の単語データの**どのフィールドを修正すべきか**を判断してください。

            ルール:
            1. ユーザーの指示 ("User Context & Instructions") を分析し、修正が必要なフィールド名のリストを作成してください。
            2. 出力は以下のJSON形式のみを返してください。
            3. 実際に修正を行う必要はありません。対象フィールドの特定のみが目的です。

            Output Schema:
            {
                "targets": ["term", "definition", "example", ...] 
            }
            Valid Fields: "term", "definition", "part_of_speech", "ipa", "example", "etymology", "synonyms", "collocations", "source_memo"
            `;
        } else {
            // =========================
            // REGISTER MODE PROMPT (Default)
            // =========================
            systemPrompt = `
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
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`;

        const userPrompt = `
        Target Term: ${vocab.term}
        
        [Current Data / Manual Inputs]
        - Definition: ${vocab.definition || "(Empty)"}
        - Part of Speech: ${vocab.part_of_speech || "(Empty)"}
        - Example: ${vocab.example || "(Empty)"}
        - Synonyms: ${vocab.synonyms?.join(", ") || "(Empty)"}
        - Collocations: ${vocab.collocations?.join(", ") || "(Empty)"}
        - Etymology: ${vocab.etymology || "(Empty)"}
        - IPA: ${vocab.ipa || "(Empty)"}
        - Source/Memo: ${vocab.source_memo || "(Empty)"}

        [User Context & Instructions]
        """
        ${chat_context || "None"}
        """

        Instruction: 
        Instruction: 
        ${mode === "edit"
                ? "ユーザーの指示に従い、必要なフィールドのみを修正したJSONを返してください。"
                : mode === "predict"
                    ? "ユーザーの指示を分析し、修正対象となるフィールド名のリストをJSONで返してください。"
                    : "不足している全てのフィールドを埋めて完全なJSONを作成してください。ユーザーの指示がある場合はそれを最優先してください。"
            }
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

        console.log("Gemini Content Generated:", content);

        // ==========================================
        // 3.5. PREDICT MODE EARLY RETURN
        // ==========================================
        if (mode === "predict") {
            console.log("Predict mode completed. Returns targets:", content.targets);
            return new Response(JSON.stringify({ success: true, targets: content.targets || [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }


        // ==========================================
        // 4. Generate Embedding (If term/definition changed or new)
        // ==========================================
        // In EDIT mode, we only regenerate embedding if term or definition changed.
        // In REGISTER mode, we always generate.

        let embedding = null;
        const shouldGenerateEmbedding = mode === "register" || content.term || content.definition;

        if (shouldGenerateEmbedding) {
            const embeddingModel = "text-embedding-004";
            // Use the EXTRACTED term if provided, otherwise current term
            const finalTerm = content.term || vocab.term;
            // Use new definition if provided, otherwise current definition
            const finalDef = content.definition || vocab.definition || "";

            console.log("Generating Embedding for term:", finalTerm);

            const embeddingUrl = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${googleApiKey}`;

            const embeddingPayload = {
                model: `models/${embeddingModel}`,
                content: {
                    parts: [{ text: `${finalTerm}: ${finalDef}` }]
                }
            };

            const embeddingResponse = await fetch(embeddingUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(embeddingPayload)
            });

            if (!embeddingResponse.ok) {
                // Warning only, don't fail the whole request
                console.error("Embedding generation failed:", await embeddingResponse.text());
            } else {
                const embeddingData = await embeddingResponse.json();
                embedding = embeddingData.embedding.values;
                console.log("Embedding generated (Length:", embedding.length, ")");
            }
        }


        // ==========================================
        // 5. Update the database (Using Shared Drizzle Client)
        // ==========================================

        // Prepare payload with ONLY the fields present in 'content' (plus common fields)
        const updatePayload: any = {
            ...content, // Spread all generated fields
            is_generating: false,
            status: vocab.status === 'uninput' ? 'inputted' : vocab.status, // Auto-promote status if needed
            updated_at: new Date(),
        };

        if (embedding) {
            updatePayload.embedding = embedding;
        }

        // Just logging
        if (content.term && content.term !== vocab.term) {
            console.log(`Updating term from '${vocab.term}' to '${content.term}'`);
        }

        await db.update(vocabulary)
            .set(updatePayload)
            .where(eq(vocabulary.id, record_id));

        console.log("Database updated successfully via Drizzle.");

        return new Response(JSON.stringify({ success: true, updated_fields: Object.keys(content) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);

        // Attempt to reset is_generating flag using getDb() if we have a record_id
        if (record_id) {
            try {
                // Initialize DB safely even in catch block
                const db = getDb();
                await db.update(vocabulary)
                    .set({ is_generating: false })
                    .where(eq(vocabulary.id, record_id));
                console.log("Reset is_generating to false due to error.");
            } catch (resetError) {
                console.error("Failed to reset is_generating flag:", resetError);
            }
        }

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});