-- ─── Two-Factor Authentication ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_2fa (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    secret      TEXT NOT NULL,
    backup_codes TEXT[] NOT NULL DEFAULT '{}',
    enabled     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ
);

-- ─── Security Events Audit Trail ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata   JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_events_user    ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_events_type    ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_ip      ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_sec_events_created ON security_events(created_at DESC);

-- ─── IP Blacklist ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_blacklist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason     TEXT,
    blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip      ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires ON ip_blacklist(expires_at)
    WHERE expires_at IS NOT NULL;

-- ─── Cleanup functions (call via cron or pg_cron) ─────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_blacklist() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM ip_blacklist
    WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$;

-- Auto-purge security events older than 90 days
CREATE OR REPLACE FUNCTION purge_old_security_events() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM security_events WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- ─── Security event types reference (informational) ───────────────────────────
-- login_success          login_success_2fa    login_failed
-- login_blocked_bf       login_blocked_status login_blocked_ip
-- 2fa_enabled            2fa_disabled         2fa_failed
-- password_changed       email_verified
-- account_suspended      account_deleted
