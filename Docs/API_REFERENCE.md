提示された最新の要件定義書 (v5.3) と データベース設計書 (v6.3) に基づき、**API設計書 (Version 6.1)** を作成しました。

主な変更点は、単語データのリッチ化（IPA、語源、類義語、コロケーションなど）に伴う、**レスポンスボディとAI生成プロセス（Async API）の入出力定義の拡張**です。

以下のMarkdownを `API_REFERENCE.md` として保存してください。

-----

# API設計書：Context-Based AI Vocabulary App

**Version:** 6.1 (Rich Vocabulary Support)
**Last Updated:** 2025-12-06

## 1\. アーキテクチャ概要

本システムは、即応性が求められるUI操作と、実行時間の長いAI処理を分離したハイブリッドAPI構成を採用する。

| API種別 | Base URL (Example) | 技術スタック | 用途 |
| :--- | :--- | :--- | :--- |
| **Sync API** | `/api` | **Hono** (on Vercel) | CRUD操作、検索、設定取得 (10秒以内) |
| **Async API** | `<SUPABASE_PROJECT_URL>/functions/v1` | **Edge Functions** (Deno) | AI生成、ベクトル化、バッチ処理 (最大60秒+) |

-----

## 2\. 共通仕様 (Common Specifications)

### 2.1. 認証 (Authentication)

全てのエンドポイントで、Supabase Auth が発行する JWT (Access Token) を必須とする。

  * **Header:** `Authorization: Bearer <JWT_TOKEN>`

### 2.2. BYOK (Bring Your Own Key) ヘッダー

**Async API (AI処理)** を呼び出す際は、クライアント側で復号したOpenAI APIキーをヘッダーに含める必要がある。
※ Sync API には送信してはならない（ログに残るリスクがあるため）。

  * **Header:** `X-OpenAI-Key: <DECRYPTED_API_KEY>`

-----

## 3\. Sync API Reference (Hono)

Vercel上で動作する、フロントエンドとの通信用API。

### 3.1. Vocabulary (単語管理)

#### `GET /api/vocabulary`

単語一覧を取得する。検索・フィルタリング対応。
リッチ化されたメタデータ（発音、語源など）も全て返す。

  * **Query Parameters:**

      * `limit`: 取得件数 (default: 50)
      * `offset`: ページネーション用
      * `category_id`: カテゴリで絞り込み (Optional)
      * `status`: 学習ステータス (`uninput`, `inputted`, etc.)
      * `q`: 全文検索キーワード (単語、意味、例文)

  * **Response Example:**

    ```json
    {
      "data": [
        {
          "id": "uuid-...",
          "term": "ubiquitous",
          "definition": "至る所にある、偏在する",
          "part_of_speech": "adjective",  // [New]
          "ipa": "/juːˈbɪkwɪtəs/",        // [New]
          "example": "Smartphones have become ubiquitous.",
          "etymology": "From Latin 'ubique' meaning 'everywhere'.", // [New]
          "synonyms": ["omnipresent", "pervasive"], // [New] Array
          "collocations": ["become ubiquitous", "ubiquitous presence"], // [New] Array
          "source_memo": "From tech article",
          "is_generating": false,
          "status": "inputted"
        }
      ],
      "total": 120
    }
    ```

#### `POST /api/vocabulary`

単語を手動登録する（AI補完前の初期データ作成）。
ユーザーが手動で詳細情報を入れたい場合にも対応する。

  * **Request Body:**
    ```json
    {
      "term": "epiphany",
      "definition": "突然のひらめき",  // Optional
      "example": "I had an epiphany.", // Optional
      "source_memo": "From a movie",   // Optional
      "category_id": "uuid-..."        // Optional
      // 手動入力があれば以下も受け付ける
      // "ipa": "...", 
      // "etymology": "..." 
    }
    ```
  * **Response:** Created Object (IDを含む)

#### `PATCH /api/vocabulary/:id`

単語データを部分更新する（手動編集用）。

  * **Request Body:** (更新したいフィールドのみ)
    ```json
    {
      "etymology": "修正した語源解説"
    }
    ```

#### `DELETE /api/vocabulary/:id`

単語を削除する。

### 3.2. Categories (カテゴリ管理)

#### `GET /api/categories`

ユーザーのカテゴリ一覧を取得する。

#### `POST /api/categories`

新しいカテゴリを作成する。

  * **Request Body:**
    ```json
    { "name": "Chapter 1" }
    ```

### 3.3. Profile (ユーザー設定)

#### `GET /api/profile`

ユーザー設定を取得する。

#### `PATCH /api/profile`

設定を更新する。

-----

## 4\. Async API Reference (Supabase Edge Functions)

Supabase上で動作する、AI・ベクトル処理用API。クライアントから直接呼び出す("Fire-and-Forget")。

### 4.1. Process Vocabulary (AI補完・生成)

#### `POST /functions/v1/process-vocabulary`

単語登録直後、または編集リクエスト時にAI生成を行う。
**最新仕様に基づき、多角的な記憶フック（語源、IPA、類義語など）を生成する。**

  * **Headers:**
      * `Authorization`: Bearer Token
      * `X-OpenAI-Key`: **Required** (Decrypted Key)
  * **Request Body:**
    ```json
    {
      "mode": "register" | "edit",
      "vocabulary_id": "uuid-...",
      
      // mode="register" の場合:
      "manual_input": { "term": "..." }, 
      "chat_context": "文脈テキスト...",
      
      // mode="edit" の場合:
      "instruction": "語源をもっと詳しく", 
      "target_fields": ["etymology"] 
    }
    ```
  * **Internal Behavior:**
    1.  `vocabulary` テーブルの `is_generating` を `true` に更新。
    2.  OpenAI API をコール。
          * System Promptにて、以下のJSONスキーマでの出力を強制する：
              * `definition`, `part_of_speech`, `ipa`
              * `example` (Context-aware)
              * `etymology` (Memory hook)
              * `synonyms` (Array)
              * `collocations` (Array)
          * Embedding生成も行う。
    3.  生成結果を `vocabulary` テーブルに **PATCH (差分更新)**。
    4.  `is_generating` を `false` に更新。

### 4.2. Quiz Generator (クイズ生成)

#### `POST /functions/v1/generate-quiz`

クイズセッション用データを生成する。
DBのRPC `get_quiz_distractors` を使用し、**品詞 (part\_of\_speech)** を考慮した誤答選択肢を生成する。

  * **Request Body:**
    ```json
    {
      "question_count": 10,
      "filter_category_ids": ["uuid-1", "uuid-2"],
      "include_uncategorized": true,
      "mode": "random" | "weakness" | "review"
    }
    ```
  * **Response Example:**
    ```json
    {
      "quiz_id": "session-uuid",
      "questions": [
        {
          "vocabulary_id": "uuid...",
          "question_text": "The _______ reached a deadlock.",
          "correct_answer": "negotiation",
          "correct_part_of_speech": "noun", // UIでのヒント表示用
          "options": [
            "negotiation", 
            "discussion", 
            "conference", 
            "meeting"
          ]
        }
      ]
    }
    ```

### 4.3. Import CSV (一括登録)

#### `POST /functions/v1/import-csv`

CSVデータを解析し、カテゴリ作成と単語登録を一括で行う。

-----

## 5\. Realtime Events (WebSocket)

### `postgres_changes` (Table: `vocabulary`)

  * **Event:** `UPDATE`
  * **Trigger:** Async APIによるAI生成完了時。
  * **Client Action:**
      * 受信した `new` (レコード内容) に含まれる `ipa`, `etymology` などの新フィールドをUIに即時反映させる。
      * YouGlishウィジェットやTTSボタンをアクティブにする。
      * ローディング表示を解除する。