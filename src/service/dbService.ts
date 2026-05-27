import mysql from "mysql2/promise";

function buildPool() {
  const url = process.env.MYSQL_URL;
  if (!url) {
    throw new Error("MYSQL_URL is not set");
  }
  return mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

const SCHEMA_SQL = `
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
)
`;

export class DbService {
  private static pool = buildPool();

  /**
   * 起動時にテーブルが存在しなければ作成する。
   */
  static async migrate(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.query(SCHEMA_SQL);
      console.log("DB migrate: teleport_vcs ready");
    } finally {
      connection.release();
    }
  }

  static async getConnection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      throw new Error("DB接続エラー");
    }
  }
}
