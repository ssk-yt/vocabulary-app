import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/openai-client.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { target_id, user_id } = await req.json();

        // 1. Get target word embedding
        const { data: target, error: targetError } = await supabase
            .from("vocabulary")
            .select("embedding, term, definition, part_of_speech")
            .eq("id", target_id)
            .single();

        if (targetError || !target) throw new Error("Target word not found");

        // 2. Get distractors using RPC
        const { data: distractors, error: rpcError } = await supabase.rpc(
            "get_quiz_distractors",
            {
                target_embedding: target.embedding,
                match_threshold_min: 0.3,
                match_threshold_max: 0.95,
                match_count: 3,
                filter_category_ids: [],
                include_uncategorized: true,
                current_user_id: user_id,
            }
        );

        if (rpcError) throw rpcError;

        // 3. Construct Quiz Object
        const quiz = {
            question: target.definition,
            answer: target.term,
            options: [
                { id: target_id, term: target.term, is_correct: true },
                ...distractors.map((d: any) => ({ id: d.id, term: d.term, is_correct: false })),
            ].sort(() => Math.random() - 0.5), // Shuffle
        };

        return new Response(JSON.stringify(quiz), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
