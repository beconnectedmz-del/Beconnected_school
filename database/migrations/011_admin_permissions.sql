CREATE TABLE admin_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name   VARCHAR(255) NOT NULL,
  admin_role  VARCHAR(100) NOT NULL
    CHECK (admin_role IN ('super_admin','financial_manager','academic_coordinator','support')),
  permissions JSONB DEFAULT '{}',
  department  VARCHAR(100),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_profiles_user_id    ON admin_profiles(user_id);
CREATE INDEX idx_admin_profiles_admin_role ON admin_profiles(admin_role);

CREATE TRIGGER admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tabela de auditoria (regista todas as acções admin)
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  actor_role   VARCHAR(100),
  action       VARCHAR(255) NOT NULL,
  resource     VARCHAR(100) NOT NULL,
  resource_id  UUID,
  old_value    JSONB,
  new_value    JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id    ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource    ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_action      ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at  ON audit_logs(created_at DESC);

-- Notificações do sistema
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(100) NOT NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  data         JSONB DEFAULT '{}',
  is_read      BOOLEAN DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  channel      VARCHAR(50) DEFAULT 'in_app'
    CHECK (channel IN ('in_app','email','push','sms')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX idx_notifications_is_read   ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type      ON notifications(type);
CREATE INDEX idx_notifications_created   ON notifications(created_at DESC);

-- Default permissions por role (comentários documentados)
COMMENT ON TABLE admin_profiles IS
  'super_admin: acesso total; financial_manager: transactions + payouts + relatorios; academic_coordinator: courses + lessons + feedbacks + validacoes; support: users(read) + tickets + live_sessions(read)';
