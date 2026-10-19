BEGIN;

LOCK TABLE public.audit_logs IN ACCESS EXCLUSIVE MODE;

CREATE SEQUENCE IF NOT EXISTS public.audit_logs_log_number_seq;

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS log_number bigint;

WITH numbered_logs AS (
    SELECT
        id,
        row_number() OVER (ORDER BY created_at ASC NULLS FIRST, id ASC) AS log_number
    FROM public.audit_logs
    WHERE log_number IS NULL
)
UPDATE public.audit_logs AS audit_log
SET log_number = numbered_logs.log_number
FROM numbered_logs
WHERE audit_log.id = numbered_logs.id;

ALTER TABLE public.audit_logs
    ALTER COLUMN log_number
    SET DEFAULT nextval('public.audit_logs_log_number_seq'::regclass);

ALTER SEQUENCE public.audit_logs_log_number_seq
    OWNED BY public.audit_logs.log_number;

SELECT setval(
    'public.audit_logs_log_number_seq'::regclass,
    COALESCE(MAX(log_number), 1),
    MAX(log_number) IS NOT NULL
)
FROM public.audit_logs;

ALTER TABLE public.audit_logs
    ALTER COLUMN log_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS audit_logs_log_number_key
    ON public.audit_logs (log_number);

COMMIT;
