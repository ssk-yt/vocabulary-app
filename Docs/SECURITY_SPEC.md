# セキュリティ実装仕様書：Context-Based AI Vocabulary App

**Version:** 1.0
**Target:** Client-Side Encryption (BYOK Strategy)
**Last Updated:** 2025-12-06

## 1\. 概要 (Overview)

本アプリケーションは **"Bring Your Own Key" (BYOK)** モデルを採用しており、ユーザーのOpenAI APIキーを保護するために **Zero Knowledge Architecture** を徹底する。

  * **原則:** サーバー（Supabase DB, Vercel, Logs）は、**いかなる時点でもユーザーのAPIキー（平文）を永続化してはならない**。
  * **責任境界:**
      * **Client:** 暗号化・復号の全責任を持つ。
      * **Server (DB):** 暗号化されたブロブ（意味不明な文字列）のみを保存する。
      * **Edge Function:** リクエストの瞬間のみメモリ上で平文キーを受け取り、処理終了とともに破棄する。

-----

## 2\. 暗号化方式 (Cryptographic Standards)

ブラウザ標準の **Web Crypto API (`window.crypto.subtle`)** を使用する。外部ライブラリ（crypto-js等）は原則使用しない（バンドルサイズ削減とセキュリティ強度の担保のため）。

### 2.1. アルゴリズム選定

| Component | Specification | Value / Setting |
| :--- | :--- | :--- |
| **Encryption** | **AES-GCM** | Authenticated Encryption (機密性 + 完全性)。 |
| **Key Length** | **256 bits** | AES-256。 |
| **IV (Nonce)** | **12 bytes** | 推奨長。レコードごとに**必ずランダム生成**する。 |
| **Key Derivation** | **PBKDF2** | ユーザーの「同期パスワード」から暗号化鍵を生成する。 |
| **KDF Digest** | **SHA-256** | |
| **KDF Iterations**| **100,000+** | ブルートフォース攻撃対策。 |
| **Salt** | **16 bytes** | ユーザーごとに**必ずランダム生成**する。 |

-----

## 3\. データ構造 (Data Structure)

データベースの `profiles.encrypted_api_key` カラムには、復号に必要なメタデータ（Salt, IV）と暗号文を結合した**単一の文字列**として保存する。

### 3.1. 保存フォーマット

```text
<Version>:<Salt_Base64>:<IV_Base64>:<Ciphertext_Base64>
```

  * **Version:** 将来的なアルゴリズム変更に備える（現在は `v1` 固定）。
  * **Delimiter:** コロン (`:`) を使用。

**例:**

```text
v1:Xu8/a...==:Z9b/c...==:d4F/e...==
```

-----

## 4\. 鍵管理ライフサイクル (Key Lifecycle)

### 4.1. マスターキー生成フロー (Key Derivation)

ユーザーが入力した「同期用パスワード（Passphrase）」から、暗号化/復号に使用する **Master Key (CryptoKey)** を生成する。

1.  **Input:** ユーザー入力パスワード (String) + Salt (Random 16bytes or Stored Salt)
2.  **Process:** `PBKDF2` (SHA-256, 100k iterations)
3.  **Output:** AES-GCM用 `CryptoKey` オブジェクト

### 4.2. APIキー保存フロー (Encryption)

ユーザーが設定画面でOpenAIキーを入力した際の処理。

1.  **Generate:** ランダムな `Salt` (16 bytes) と `IV` (12 bytes) を生成。
2.  **Derive:** パスワードと `Salt` から **Master Key** を生成。
3.  **Encrypt:** `AES-GCM` で APIキー（平文）を暗号化。
4.  **Format:** `v1:Salt:IV:Ciphertext` 形式の文字列を作成。
5.  **Save:** Supabaseの `profiles` テーブルへ `PATCH` リクエスト。

### 4.3. アプリ利用フロー (Decryption & Usage)

アプリ起動時（またはパスワード入力時）の処理。

1.  **Fetch:** Supabaseから `encrypted_api_key` 文字列を取得。
2.  **Parse:** 文字列を分解し、`Salt`, `IV`, `Ciphertext` を抽出。
3.  **Derive:** ユーザー入力パスワードと抽出した `Salt` から **Master Key** を再生成。
4.  **Decrypt:** `AES-GCM` で復号し、平文の APIキー を取得。
5.  **Store (Memory):** 平文キーを **Zustand Store (Memory Only)** に保存。
      * **重要:** `localStorage` や `sessionStorage` には**絶対に保存しない**。
      * ブラウザリロードで消える仕様とする（セキュリティ重視）。

-----

## 5\. APIリクエスト仕様 (Secure Transport)

クライアントから Edge Function (AI処理) を呼び出す際の手順。

### 5.1. ヘッダー送信

復号された平文キーは、カスタムヘッダーを介して送信する。

  * **Header Name:** `X-OpenAI-Key`
  * **Value:** `<Decrypted_Raw_API_Key>`
  * **Protocol:** 必ず **HTTPS** (TLS 1.2+) 上で行うこと。

### 5.2. Edge Function側の責務

サーバーレス関数（Deno）内での取り扱いルール。

1.  **Extraction:** リクエストヘッダーからキーを取得。
2.  **Initialization:** OpenAI SDKの初期化に使用。
    ```typescript
    const apiKey = req.headers.get("X-OpenAI-Key");
    const openai = new OpenAI({ apiKey: apiKey });
    ```
3.  **No Logging:** `console.log(apiKey)` 等、キーを含むオブジェクトをログ出力してはならない。
4.  **Ephemeral:** 変数は関数の実行終了とともにメモリから解放される（意図的にDB保存などをしない限り安全）。

-----

## 6\. 実装コード例 (Implementation Snippets)

### 6.1. 文字列 ⇔ Buffer 変換ユーティリティ

```typescript
// Base64 Encode
const buff_to_base64 = (buff: Uint8Array): string => btoa(String.fromCharCode(...buff));

// Base64 Decode
const base64_to_buff = (b64: string): Uint8Array => 
  Uint8Array.from(atob(b64), c => c.charCodeAt(0));
```

### 6.2. 鍵導出 (PBKDF2)

```typescript
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // 鍵のエクスポートを禁止
    ["encrypt", "decrypt"]
  );
}
```

-----

## 7\. エラーハンドリングとUX

  * **復号失敗:** パスワード間違い等で復号に失敗した場合（`DOMException`）、ユーザーに「同期パスワードが間違っています」と通知し、再入力を促す。
  * **パスワード紛失:** パスワードを忘れた場合、復号は数学的に不可能である。ユーザーには「APIキーの再設定（上書き）」を行わせるフローを提供する。