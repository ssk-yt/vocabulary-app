-- 1. Update vocabulary table embedding column
-- Explicitly set existing values to NULL because converting 1536-dim vectors to 768-dim is not possible directly/meaningfully without re-embedding.
ALTER TABLE vocabulary ALTER COLUMN embedding TYPE vector(768) USING NULL;

-- 2. Update the function get_quiz_distractors
-- First drop the old function with the specific signature
DROP FUNCTION IF EXISTS get_quiz_distractors(vector(1536), float, float, int, uuid[], boolean, uuid);

-- Recreate with vector(768)
CREATE OR REPLACE FUNCTION get_quiz_distractors(
  target_embedding vector(768), -- Updated to 768
  match_threshold_min float,
  match_threshold_max float,
  match_count int,
  filter_category_ids uuid[],
  include_uncategorized boolean,
  current_user_id uuid
)
RETURNS TABLE (
  id uuid,
  term text,
  definition text,
  part_of_speech text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id, v.term, v.definition, v.part_of_speech,
    1 - (v.embedding <=> target_embedding) AS similarity
  FROM vocabulary v
  WHERE v.user_id = current_user_id
  AND (
      (cardinality(filter_category_ids) = 0 AND include_uncategorized = true)
      OR
      (v.category_id = ANY(filter_category_ids))
      OR
      (include_uncategorized = true AND v.category_id IS NULL)
  )
  AND (1 - (v.embedding <=> target_embedding)) BETWEEN match_threshold_min AND match_threshold_max
  ORDER BY random()
  LIMIT match_count;
END;
$$;
