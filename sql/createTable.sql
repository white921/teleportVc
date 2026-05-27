CREATE TABLE IF NOT EXISTS teleport_vcs (
  channel_id         VARCHAR(32)  NOT NULL PRIMARY KEY,
  owner_id           VARCHAR(32)  NOT NULL,
  owner_display_name VARCHAR(128) NOT NULL,
  guild_id           VARCHAR(32)  NOT NULL,
  category_id        VARCHAR(32)  NOT NULL,
  parent_vc_id       VARCHAR(32)  NOT NULL,
  has_been_occupied  BOOLEAN      NOT NULL DEFAULT FALSE,
  auto_rename        BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active)
);
