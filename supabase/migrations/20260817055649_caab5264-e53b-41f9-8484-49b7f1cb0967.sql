CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text,
  ip_address text,
  user_agent text,
  device text,
  browser text,
  os text,
  method text NOT NULL DEFAULT 'password',
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_login_history_user ON public.login_history (user_id, created_at DESC);

DROP FUNCTION IF EXISTS public.get_users_with_stats();

CREATE FUNCTION public.get_users_with_stats()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz,
  last_seen_at timestamptz,
  is_blocked boolean,
  blocked_at timestamptz,
  blocked_reason text,
  is_suspicious boolean,
  cancelled_orders_count integer,
  orders_count bigint,
  total_spent bigint,
  last_login_at timestamptz,
  logins_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.phone,
    p.avatar_url,
    p.created_at,
    p.last_seen_at,
    p.is_blocked,
    p.blocked_at,
    p.blocked_reason,
    p.is_suspicious,
    p.cancelled_orders_count,
    COALESCE(o.cnt, 0) AS orders_count,
    COALESCE(o.sum_total, 0)::bigint AS total_spent,
    l.last_login_at,
    COALESCE(l.logins_count, 0) AS logins_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt, SUM(total) AS sum_total
    FROM public.orders
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) o ON o.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, MAX(created_at) AS last_login_at, COUNT(*) AS logins_count
    FROM public.login_history
    WHERE user_id IS NOT NULL AND success
    GROUP BY user_id
  ) l ON l.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;