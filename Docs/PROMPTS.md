# AIプロンプト設計書：Context-Based AI Vocabulary App

**Version:** 2.2 (Remove Quiz Explanation)
**Target SDK:** OpenAI Node.js SDK / Vercel AI SDK
**Last Updated:** 2025-12-06

## 1\. プロンプトエンジニアリング戦略

本アプリでは、AIの出力をプログラムで確実に処理するため、全ての生成タスクにおいて **Structured Output (JSON Mode)** を強制する。

  * **言語設定:** 学習対象言語（ターゲット）と解説言語（日本語）を明確に区別して指示する。
  * **防御策 (Safety):** ユーザー入力によるプロンプトインジェクションを防ぐため、System Prompt内で制約を明記する。

-----

## 2\. タスク定義: 新規登録 (Registration / Full Context Generation)

ユーザーが入力した「文脈（Chat Context）」と「手動入力値（Manual Input）」をもとに、単語データの空欄を全て埋め、**多角的な記憶フック**を生成する。

### 2.1. System Prompt (日本語版)

```text
あなたは、文脈の中で言葉を学ぶのを手助けする、優秀な言語学者および語彙コーチです。
ユーザーの入力から、学習効果を高めるための詳細な構造化データを抽出・生成することが目的です。

ルール:
1. ユーザーの「チャット文脈 (Chat Context)」と「手動入力 (Manual Input)」を分析してください。
2. 対象となる「単語 (Term)」が指定されていない場合は特定してください。
3. 文脈に即した最適な「意味 (Definition)」と「品詞 (Part of Speech)」を特定してください。
4. 正しい発音記号 (IPA) を提供してください。
5. 記憶の定着を助けるための「語源 (Etymology)」「類義語 (Synonyms)」「コロケーション (Collocations)」を生成してください。
   - 語源は、単語のイメージが湧くような簡潔な解説にしてください。
   - コロケーションは、その単語がよく使われる自然な語の組み合わせを挙げてください。
6. 「例文 (Example)」を抽出または生成してください。
   - 文脈自体が例文として使える場合はそれを使用します。
7. 解説（意味、語源など）は日本語で出力してください。単語、例文、コロケーションはターゲット言語で出力してください。
8. 出力は指定されたJSONスキーマに準拠した有効なJSONオブジェクトでなければなりません。
```

### 2.2. Input Format (User Prompt)

```text
Target Term: {{manual_term}} (if any)
Manual Definition: {{manual_definition}} (if any)
Manual Example: {{manual_example}} (if any)

Chat Context:
"""
{{chat_context}}
"""

Instruction: 上記の文脈に基づいて、不足している全てのフィールドを埋めてください。
```

### 2.3. Output Schema (Zod)

```typescript
import { z } from 'zod';

export const VocabularyRegistrationSchema = z.object({
  // Basic Info
  term: z.string().describe("対象となる単語またはフレーズ（原形）"),
  definition: z.string().describe("提供された特定の文脈における単語の意味（日本語）"),
  part_of_speech: z.string().describe("文脈における品詞（例: noun, verb, adjective）。英語で記述。"),
  ipa: z.string().describe("国際音声記号 (IPA) 表記（例: /əˈpɪfəni/）"),
  
  // Context & Memory Hooks
  example: z.string().describe("その単語を含んだ自然で実用的な例文（ターゲット言語で）"),
  etymology: z.string().describe("単語の語源、構成要素、または記憶の助けになる由来の簡潔な解説（日本語）"),
  synonyms: z.array(z.string()).describe("文脈的に近い類義語や言い換え表現のリスト（3つ程度）"),
  collocations: z.array(z.string()).describe("その単語と頻繁に使われる語の組み合わせ（コロケーション）のリスト（3つ程度）"),
  
  // Meta
  source_memo: z.string().optional().describe("文脈の出典や状況についての短いメモ")
});
```

-----

## 3\. タスク定義: スマート編集 (Smart Edit)

ユーザーのチャット指示に基づき、特定のフィールドのみを更新する。

### 3.1. System Prompt (日本語版)

```text
あなたは親切なテキスト編集アシスタントです。
ユーザーの指示に基づいて、単語データの「特定のフィールド」のみを更新するのが仕事です。

ルール:
1. ユーザーがどの項目（意味、例文、語源、コロケーションなど）を変えたいのか特定してください。
2. そのフィールドの新しい内容のみを生成してください。
3. 要求されていないフィールドは絶対に変更しないでください。
4. 有効なJSONを出力してください。
```

### 3.2. Output Schema (Zod)

```typescript
import { z } from 'zod';

export const VocabularyEditSchema = z.object({
  target_field: z.enum([
    'term', 'definition', 'example', 'part_of_speech', 
    'ipa', 'etymology', 'synonyms', 'collocations', 'source_memo'
  ]),
  new_content: z.union([
    z.string(), 
    z.array(z.string())
  ]).describe("対象フィールドの更新された内容（文字列または配列）"),
  reasoning: z.string().optional().describe("更新理由（デバッグ用）")
});
```

-----

## 4\. Few-Shot Examples (期待する挙動の例)

### 4.1. 新規登録 (Registration)

**Input:**

  * Context: "The sheer magnitude of the project overwhelmed the team."
  * Manual Input: Term: "magnitude"

**Expected Output:**

```json
{
  "term": "magnitude",
  "definition": "（規模・重要性などの）大きさ、重大さ",
  "part_of_speech": "noun",
  "ipa": "/ˈmæɡnɪtuːd/",
  "example": "The sheer magnitude of the project overwhelmed the team.",
  "etymology": "ラテン語の 'magnus' (大きい) に由来。'magnify' (拡大する) と同じ語源。",
  "synonyms": ["scale", "extent", "immensity"],
  "collocations": ["sheer magnitude", "order of magnitude", "assess the magnitude"],
  "source_memo": "プロジェクト管理に関する文脈から"
}
```

### 4.2. スマート編集 (Edit Collocations)

**Input:**

  * Term: "decision"
  * Instruction: "もっとビジネスでよく使うコロケーションに変えて"

**Expected Output:**

```json
{
  "target_field": "collocations",
  "new_content": ["make a strategic decision", "reach a decision", "decision-making process"],
  "reasoning": "ユーザーがビジネス文脈を求めたため、よりフォーマルで戦略的な組み合わせに変更。"
}
```