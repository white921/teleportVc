export const VC_PANEL_MESSAGES = {
  TITLE: "VC操作パネル",
  DESCRIPTION:
    "このVCを操作できます。\n" +
    "・VC設定を変更: VC名 / ステータス / 人数制限 をまとめて変更\n" +
    "・権限を確認: 公開/シークレット状態と人数制限を表示\n" +
    "・カテゴリを移動: 親カテゴリを変更\n" +
    "・シークレット: 指定メンバーだけが入れる非公開VCにする\n" +
    "・パネルを再配置: チャットで流れたパネルを最下部に出し直す",
  CHANGE_VC_SETTINGS: "VC設定を変更",
  VIEW_PERMISSIONS: "権限を確認",
  CHANGE_CATEGORY: "カテゴリを移動",
  CATEGORY_SELECT_PLACEHOLDER: "移動先カテゴリを選択",
  SECRET: "シークレット",
  RELOCATE_PANEL: "パネルを再配置",
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

export const MOVE_CATEGORY_OPTIONS = [
  { id: "1401156195011657820", label: "ゲーム" },
  { id: "1401183960024743991", label: "雑談VC" },
  { id: "1403623803304542218", label: "ツーショ" },
] as const;

export const MODAL_TITLES = {
  CHANGE_VC_SETTINGS: "VC設定の変更",
} as const;

export const MODAL_LABELS = {
  VC_NAME: "VC名",
  VC_STATUS: "ステータス (空欄で解除)",
  VC_LIMIT: "人数制限 (0〜99、0で無制限)",
} as const;
