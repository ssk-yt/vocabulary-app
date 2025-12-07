ご提示いただいた議論（`sessionStorage` の活用とロック解除モーダルの導入）を反映し、**セキュリティ実装仕様書 (Version 1.1)** を作成しました。

以下のMarkdownを `SECURITY_SPEC.md` として保存してください。

-----

# セキュリティ実装仕様書：Context-Based AI Vocabulary App

**Version:** 1.1 (Session Storage & Unlock Modal)
**Target:** Client-Side Encryption (BYOK Strategy)
**Last Updated:** 2025-12-07

## 1\. 概要 (Overview)

本アプリケーションは **"Bring Your Own Key" (BYOK)** モデルを採用しており、ユーザーのOpenAI APIキーを保護するために **Zero Knowledge Architecture** を徹底する。

  * **原則:** サーバー（Supabase DB, Vercel, Logs）は、**いかなる時点でもユーザーのAPIキー（平文）を永続化してはならない**。
  * **責任境界:**
      * **Client:** 暗号化・復号の全責任を持つ。
      * **Server (DB):** 暗号化されたブロブ（意味不明な文字列）のみを保存する。
      * **Session:** 利便性のため、復号済みキーは `sessionStorage` に保持し、リロード耐性を持たせる。

-----

## 2\. 暗号化方式 (Cryptographic Standards)

ブラウザ標準の **Web Crypto API (`window.crypto.subtle`)** を使用する。外部ライブラリ（crypto-js等）は原則使用しない。

### 2.1. アルゴリズム選定

| Component | Specification | Value / Setting |
| :--- | :--- | :--- |
| **Encryption** | **AES-GCM** | Authenticated Encryption (機密性 + 完全性)。 |
| **Key Length** | **256 bits** | AES-256。 |
| **IV (Nonce)** | **12 bytes** | レコードごとに**必ずランダム生成**する。 |
| **Key Derivation** | **PBKDF2** | ユーザーの「同期パスワード」から鍵を導出。 |
| **KDF Digest** | **SHA-256** | |
| **KDF Iterations**| **100,000+** | ブルートフォース攻撃対策。 |
| **Salt** | **16 bytes** | ユーザーごとに**必ずランダム生成**する。 |

-----

## 3\. データ構造 (Data Storage Strategy)

### 3.1. データベース保存 (Persistent)

Supabase (`profiles.encrypted_api_key`) には、メタデータと暗号文を結合した文字列を保存する。

  * **Format:** `<Version>:<Salt_Base64>:<IV_Base64>:<Ciphertext_Base64>`
  * **Example:** `v1:Xu8/a...==:Z9b/c...==:d4F/e...==`

### 3.2. クライアント保存 (Ephemeral)

ユーザー体験（UX）とセキュリティのバランスを取るため、以下の戦略を採用する。

| 保存場所 | 保存データ | 寿命 | 目的 |
| :--- | :--- | :--- | :--- |
| **Zustand Store** | 平文APIキー | アプリ稼働中 | ステート管理、コンポーネント間共有。 |
| **sessionStorage** | 平文APIキー | **ブラウザタブを閉じるまで** | **リロード対策。** F5を押してもキー入力を求めないため。 |
| **localStorage** | **保存しない** | - | セキュリティリスク（XSS等による永続的漏洩）回避のため使用禁止。 |

-----

## 4\. 鍵管理・UXフロー (Key Lifecycle & UX)

### 4.1. ロック解除フロー (Unlock Modal)

アプリ（または新しいタブ）を開いた際の挙動。

1.  **Check DB:** `profiles.encrypted_api_key` が存在するか確認。
      * 存在しない → 「設定画面」へ誘導（初期登録）。
      * 存在する → **Step 2** へ。
2.  **Check Session:** `sessionStorage` に平文キーがあるか確認。
      * ある（リロード時など） → **自動でロック解除**（API利用可能）。
      * ない（初回訪問、タブ再開） → **Step 3** へ。
3.  **Show Modal:** 画面全体を覆う「ロック解除モーダル」を表示。
      * ユーザーに「同期パスワード」の入力を求める。
4.  **Decrypt & Store:**
      * 入力パスワードとDBのSalt/IVを用いて復号を試行。
      * 成功 → 平文キーを `sessionStorage` (Zustand persist) に保存し、モーダルを閉じる。

### 4.2. 保存フロー (Registration)

設定画面でのキー登録時。

1.  **Generate:** Salt, IV を生成。
2.  **Encrypt:** 入力パスワードでAPIキーを暗号化。
3.  **Save:** `v1:...` 形式の文字列をDBに保存。
4.  **Sync:** 即座に平文キーを `sessionStorage` にもセットする（直後から使えるように）。

-----

## 5\. 実装要件 (Implementation Details)

### 5.1. Zustand設定

`zustand/middleware` の `persist` を使用し、ストレージエンジンを `sessionStorage` に切り替えること。

```typescript
import { createJSONStorage } from 'zustand/middleware';

// ... persist config
{
  name: 'vocab-session-storage',
  storage: createJSONStorage(() => sessionStorage), // Default is localStorage, must override.
}
```

### 5.2. APIリクエスト (Edge Functions)

クライアントからAI処理を呼び出す際は、必ず **HTTPSヘッダー** に復号済みキーを含める。

  * **Header:** `X-OpenAI-Key: <Decrypted_Key>`
  * **Edge Function側:**
      * リクエスト受信時にヘッダーからキーを取り出し、OpenAIインスタンスを初期化する。
      * 処理終了後、変数はメモリから破棄される。ログ出力は厳禁。

-----

## 6\. エラーハンドリング

  * **パスワード忘れ:** 復号不可能であるため、「キーの上書き登録（リセット）」のみ許可するフローとする。
  * **復号失敗:** パスワードミス時はトースト通知（Toast）で警告し、再入力を促す。