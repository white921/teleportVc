export const VC_PANEL_MESSAGES = {
  TITLE: "VC操作パネル",
  DESCRIPTION:
    "このVCの設定を変更できます。\n" +
    "・人数制限: 0〜99（0で無制限）\n" +
    "・VC名: 任意の名前\n" +
    "・ステータス: VC上部に表示される一文（空欄でクリア）",
  CHANGE_VC_NAME: "VC名を変更",
  CHANGE_VC_LIMIT: "人数制限を変更",
  CHANGE_VC_STATUS: "ステータスを変更",
  CHANGE_CATEGORY: "カテゴリを移動",
  CATEGORY_SELECT_PLACEHOLDER: "移動先カテゴリを選択",
  SECRET: "シークレット",
  SECRET_USER_SELECT_PLACEHOLDER:
    "追加で許可するユーザーを選択（最大25人）",
  SECRET_DESCRIPTION:
    "@everyoneの閲覧・接続を遮断し、現在VC内のメンバー＋選択したユーザーのみがアクセスできるようになります。",
} as const;

export const MODAL_TITLES = {
  CHANGE_VC_NAME: "VC名の変更",
  CHANGE_VC_LIMIT: "人数制限の変更",
  CHANGE_VC_STATUS: "ステータスの変更",
} as const;

export const MODAL_LABELS = {
  VC_NAME: "新しいVC名",
  VC_LIMIT: "人数制限 (0〜99、0で無制限)",
  VC_STATUS: "ステータス (空欄で解除)",
} as const;
