-- Track how many times we've retried SRI submission for a sale
-- and when the last retry happened. Caps at 5 to avoid infinite retries
-- on permanently-rejected invoices.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sri_retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sri_last_retry_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS sales_sri_retry_idx
  ON sales (sri_status, sri_retry_count, created_at)
  WHERE sri_status IN ('error', 'sent');
