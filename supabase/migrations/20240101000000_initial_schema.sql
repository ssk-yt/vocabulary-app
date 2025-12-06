-- 1. ベクトル検索用の拡張機能を有効化
create extension if not exists vector;

-- 2. 学習ステータスの列挙型定義
create type learning_status as enum (
  'uninput',   -- 未インプット: 登録直後
  'inputted',  -- インプット済: クイズ対象
  'instant',   -- 瞬発クリア: 記憶定着
  'speakable'  -- 話せる: 完了
);

-- 3. Profiles: ユーザー固有設定と暗号化キー
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  
  -- Security: クライアント側で暗号化されたAPIキー文字列
  encrypted_api_key text, 
  
  -- Config: AI自動補完のデフォルト設定
  is_ai_auto_complete_on boolean default true,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Categories: 単語を整理するフォルダ
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  
  name text not null, -- 例: "金フレ", "日常単語", "TOEIC"
  
  created_at timestamptz default now()
);

-- 5. Vocabulary: 全単語データ (Unified & Rich)
create table vocabulary (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  
  -- Category Link: NULLの場合は「未分類(No Category)」として扱う
  category_id uuid references categories(id) on delete set null,
  
  -- Basic Info
  term text not null,       -- 単語
  definition text,          -- 意味 (AI補完対象)
  part_of_speech text,      -- [New] 品詞 (noun, verb...)
  ipa text,                 -- [New] 発音記号
  
  -- Context & Memory Hooks
  example text,             -- 例文 (AI補完対象)
  etymology text,           -- [New] 語源解説
  synonyms text[],          -- [New] 類義語リスト (Array)
  collocations text[],      -- [New] コロケーションリスト (Array)
  
  source_memo text,         -- 出典/メモ
  
  -- AI / Search / Realtime
  embedding vector(1536),              -- 意味検索・誤答生成用
  is_generating boolean default false, -- 生成中ローディング表示用
  
  -- Learning Status & SRS
  status learning_status default 'uninput',
  last_reviewed_at timestamptz,
  correct_count integer default 0,
  incorrect_count integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS有効化
alter table profiles enable row level security;
alter table categories enable row level security;
alter table vocabulary enable row level security;

-- Profiles Policies
create policy "Users can CRUD own profile" 
  on profiles for all using (auth.uid() = id);

-- Categories Policies
create policy "Users can CRUD own categories" 
  on categories for all using (auth.uid() = user_id);

-- Vocabulary Policies
create policy "Users can CRUD own vocabulary" 
  on vocabulary for all using (auth.uid() = user_id);

-- 基本的な外部キーインデックス
create index idx_vocabulary_user_id on vocabulary(user_id);
create index idx_vocabulary_category_id on vocabulary(category_id);

-- ベクトル検索用インデックス (HNSW)
create index idx_vocabulary_embedding on vocabulary 
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- クイズ用データ取得関数 (RPC)
create or replace function get_quiz_distractors(
  target_embedding vector(1536), -- 正解単語のベクトル
  match_threshold_min float,     -- 類似度下限 (例: 0.5)
  match_threshold_max float,     -- 類似度上限 (例: 0.85)
  match_count int,               -- 取得数 (例: 3)
  filter_category_ids uuid[],    -- 検索対象カテゴリIDのリスト
  include_uncategorized boolean, -- category_id IS NULL を対象にするか
  current_user_id uuid
)
returns table (
  id uuid,
  term text,
  definition text,
  part_of_speech text, -- [New] 品詞も返す
  similarity float
)
language plpgsql
as $$
begin
  return query
  select 
    v.id, v.term, v.definition, v.part_of_speech,
    1 - (v.embedding <=> target_embedding) as similarity
  from vocabulary v
  where v.user_id = current_user_id
  -- カテゴリフィルタリングロジック
  and (
      (cardinality(filter_category_ids) = 0 and include_uncategorized = true)
      OR
      (v.category_id = ANY(filter_category_ids))
      OR
      (include_uncategorized = true AND v.category_id IS NULL)
  )
  -- 類似度フィルタ
  and (1 - (v.embedding <=> target_embedding)) between match_threshold_min and match_threshold_max
  order by random()
  limit match_count;
end;
$$;

-- リアルタイム機能の有効化
alter publication supabase_realtime add table vocabulary;
