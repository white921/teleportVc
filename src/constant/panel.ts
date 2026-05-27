export const VC_PANEL_MESSAGES = {
  TITLE: "VC操作パネル",
  DESCRIPTION:
    "このVCの設定を変更できます。\n" +
    "・人数制限: 0〜99（0で無制限）\n" +
    "・VC名: 任意の名前\n" +
    "・ステータス: VC上部に表示される一文",
  CHANGE_VC_NAME: "VC名を変更",
  CHANGE_VC_LIMIT: "人数制限を変更",
  CHANGE_VC_STATUS: "ステータスを変更",
  CHANGE_CATEGORY: "カテゴリを移動",
  CATEGORY_SELECT_PLACEHOLDER: "移動先カテゴリを選択",
  SECRET: "シークレット",
  SECRET_USER_SELECT_PLACEHOLDER: "許可するユーザーを選択",
  SECRET_CONFIRM: "確定",
  SECRET_CLEAR: "全てクリア",
  SECRET_EMBED_TITLE: "シークレット設定",
  SECRET_EMBED_DESC:
    "セレクトから1人ずつ追加してください。\n" +
    "・追加済みのユーザーを再度選ぶと解除されます。\n" +
    "・「全てクリア」で初期状態（VC内メンバーと既存の閲覧許可メンバー）に戻せます。\n" +
    "「確定」を押すと、ここに表示されているメンバーだけが閲覧・接続できるようになります。",
  SECRET_SELECTED_LABEL: "権限を付与するメンバー",
  SECRET_SELECTED_NONE: "なし",
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
