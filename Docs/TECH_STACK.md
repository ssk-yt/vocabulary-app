-----

# 技術スタック定義書：Context-Based AI Vocabulary App

**Project Name:** (TBD)
**Version:** 6.1 (Final / OpenAI SDK Native)
**Last Updated:** 2025-12-06

-----

## 1\. 全体アーキテクチャ (High-Level Architecture)

**Hybrid Serverless Strategy**
フロントエンドと同期的なAPI処理は Vercel 上でホストし、長時間実行されるAI生成プロセス（Fire-and-Forget）やデータベース直結のイベントは Supabase Edge Functions に委譲するハイブリッド構成。

  * **Repo Tool:** `Turborepo` (Monorepo Management)
  * **Package Manager:** `pnpm`
  * **Deploy Target:**
      * **Frontend / Sync API:** Vercel
      * **Async Jobs / Webhooks:** Supabase Edge Functions (Deno)

-----

## 2\. フロントエンド (Web Application)

### 2.1. Core Framework

| Category | Selection | Version | Note |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js** | **15 (App Router)** | Server Actions と RSC を中心に設計。 |
| **Language** | **TypeScript** | 5.x | Strict Mode必須。 |
| **Styling** | **Tailwind CSS** | 3.x / 4.x | Utility-first CSS。 |

### 2.2. UI & Interaction

| Category | Selection | Note |
| :--- | :--- | :--- |
| **Component Lib** | **shadcn/ui** | Radix UIベース。モダンでアクセシブルなUI構築。 |
| **Icons** | **Lucide React** | 軽量ベクターアイコン。 |
| **Drag & Drop** | **@dnd-kit/core** | カンバンボード実装用。 |
| **Feedback** | **Sonner** | (shadcn/ui推奨) 洗練されたToast通知。AI完了通知に使用。 |

### 2.3. State Management & Realtime

| Category | Selection | Purpose |
| :--- | :--- | :--- |
| **Server State** | **TanStack Query (v5)** | `useMutation`の管理や、Supabase Realtimeとのキャッシュ連携を担当。 |
| **Realtime** | **Supabase-js (Subscribe)** | DBの`UPDATE`イベントを購読し、リストや詳細画面を即時更新する。 |
| **Client State** | **Zustand** | グローバルUI状態、および**復号されたAPIキーの一時的なオンメモリ保持**。 |
| **Form** | **React Hook Form** + **Zod** | バリデーションスキーマはBackendと共有。 |

-----

## 3\. バックエンド & 非同期処理 (Backend & Async)

### 3.1. Synchronous API (Interactive)

即時応答が必要なCRUD操作や検索用。

  * **Framework:** **Hono** (on Vercel Functions)
      * Next.js API Routes の代わりに採用。RPC機能によりFrontendと型安全に通信。

### 3.2. Asynchronous Jobs (AI Processing)

「Fire-and-Forget（登録ボタンを押して即終了）」を実現するための基盤。

  * **Platform:** **Supabase Edge Functions (Deno)**
      * **理由:** タイムアウト回避と、Webhooks連携の容易さ。
  * **Trigger:**
    1.  **Database Webhooks:** レコード挿入(INSERT)を検知して自動発火。
    2.  **Direct Invoke:** フロントエンドから非同期呼び出し。

-----

## 4\. データベース & ベクトル検索 (Database & Vector)

### 4.1. Primary Database

| Category | Selection | Note |
| :--- | :--- | :--- |
| **Platform** | **Supabase** | Managed PostgreSQL. |
| **ORM** | **Drizzle ORM** | 軽量・高速。Edge Functions (Deno) との相性も良好。 |
| **Migrations** | **Drizzle Kit** | スキーマ管理。 |

### 4.2. Vector Search & Quiz Logic

  * **Extension:** **pgvector**
  * **Index:** **HNSW** (高速近似近傍探索)
  * **Schema Strategy:**
      * `vocabulary` テーブル: ユーザー登録単語。
      * `dictionary_pool` テーブル: 「金フレ」等の外部辞書データ。
  * **Query Logic:**
      * 正解単語のEmbeddingベクトルに対し、`cosine_distance` で類似度検索を行う。

-----

## 5\. AI・LLM統合 (AI Integration)

**"Bring Your Own Key" (BYOK) & OpenAI-Compatible Strategy**
特定のSDKラッパーに依存せず、業界標準のインターフェースを採用することで、将来的なプロバイダー変更（Groq, DeepSeek, Local LLM等）に柔軟に対応する。

| Category | Selection | Note |
| :--- | :--- | :--- |
| **SDK** | **OpenAI Node.js SDK** | `openai` パッケージを使用。 |
| **Strategy** | **BaseURL Switching** | ユーザーが選択したプロバイダーに応じて `baseURL` と `apiKey` を動的に差し替える設計。<br>*(例: Groq使用時は `https://api.groq.com/openai/v1` を指定)* |
| **Structured Data** | **JSON Mode / Zod** | 単語登録時のデータ抽出には、プロンプトでのJSON強制または各社のJSON Modeを利用し、Zodでパースする。 |
| **Embeddings** | **OpenAI `text-embedding-3-small`** | コストパフォーマンス重視。クイズ用。 |

-----

## 6\. セキュリティ・暗号化 (Security)

**"Zero Knowledge Architecture"**

  * **Client Encryption:** **Web Crypto API (AES-GCM)**
      * ブラウザネイティブAPIでAPIキーを暗号化/復号。外部ライブラリ依存を減らす。
  * **Key Handling:**
      * 復号された生キーは、HTTPSヘッダー (`X-OpenAI-Key` 等) に乗せてEdge Functionへ送信。
      * サーバー側では決してログ出力せず、オンメモリでのみ使用して破棄する。