-- RLSの再定義 (既存のポリシーを削除して作り直す)
drop policy if exists "Users can CRUD own vocabulary" on vocabulary;

-- SELECT
create policy "Users can view own vocabulary"
  on vocabulary for select using (auth.uid() = user_id);

-- INSERT
create policy "Users can insert own vocabulary"
  on vocabulary for insert with check (auth.uid() = user_id);

-- UPDATE
create policy "Users can update own vocabulary"
  on vocabulary for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE
create policy "Users can delete own vocabulary"
  on vocabulary for delete using (auth.uid() = user_id);

-- moddatetime 拡張機能 (updated_at 自動更新)
create extension if not exists moddatetime;

create trigger handle_updated_at before update on vocabulary
  for each row execute procedure moddatetime (updated_at);
