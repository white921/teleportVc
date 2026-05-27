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

export class DbService {
  private static pool = buildPool();

  static async getConnection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      throw new Error("DB接続エラー");
    }
  }
}
