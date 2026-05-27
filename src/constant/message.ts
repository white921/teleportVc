export const TELEPORT_MESSAGE = {
  NOT_SERVER_FOUND: "サーバー情報が取得できませんでした。",
  NOT_CATEGORY_FOUND: "親カテゴリが見つかりませんでした。",
  NOT_TELEPORT_VC_FOUND: "転送用VCが見つかりませんでした。",
  CREATE_FAILED: "転送VCの作成に失敗しました。",
  DELETE_FAILED: "転送VCの削除に失敗しました。",
} as const;

export const PANEL_MESSAGE = {
  ONLY_IN_VC_CHANNEL: "このパネルは作成された個人VCチャンネル内でのみ使用できます。",
  INVALID_LIMIT: "人数制限は0〜99の整数で入力してください。",
  NAME_TOO_LONG: "VC名は100文字以内で入力してください。",
  STATUS_TOO_LONG: "ステータスは500文字以内で入力してください。",
  UPDATED_NAME: "VC名を変更しました。",
  UPDATED_LIMIT: "人数制限を変更しました。",
  UPDATED_STATUS: "ステータスを変更しました。",
  CLEARED_STATUS: "ステータスを解除しました。",
  UPDATED_CATEGORY: "カテゴリを移動しました。",
  INVALID_CATEGORY: "選択したチャンネルがカテゴリではありません。",
  CATEGORY_MOVE_FAILED: "カテゴリ移動に失敗しました。Botの権限を確認してください。",
  SECRET_APPLIED: "シークレットモードを適用しました。",
  SECRET_FAILED: "シークレットモードの適用に失敗しました。Botの権限を確認してください。",
} as const;
