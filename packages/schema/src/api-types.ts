import { z } from "zod";

// 単語登録のルール設定（バリデーション）
export const vocabularySchema = z.object({
    term: z.string().min(1, "Term is required"),
    definition: z.string().optional(),
    part_of_speech: z.string().optional(),
    example: z.string().optional(),
    source_memo: z.string().optional(),
    etymology: z.string().optional(),
    ipa: z.string().optional(),
    synonyms: z.string().optional(),
    collocations: z.string().optional(),
});

export type VocabularyInput = z.infer<typeof vocabularySchema>;

// クイズ結果のルール設定（バリデーション）
export const quizResultSchema = z.object({
    vocab_id: z.string().uuid(),
    is_correct: z.boolean(),
});

export type QuizResult = z.infer<typeof quizResultSchema>;
