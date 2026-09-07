export type Language = "auto" | "zh" | "en";
const en = {
  language: "Language",
  auto: "Follow Obsidian",
  languageDescription: "Choose the language used by Branch Note.",
  newChild: "New child note",
  untitled: "Untitled",
  start: "Start writing",
  empty: "A home for this page",
  emptyDescription:
    "This folder has no home note yet. Start writing to create one and open it in the editor.",
  placeholder: "Write your first thought…",
  done: "Done",
  saved: "Saved",
  saving: "Saving…",
  retry: "Retry save",
  deleteHome: "Delete home note",
  undo: "Undo last page action",
  undone: "Last page action undone.",
  created: "Child note created.",
  deleted: "Home note moved to trash. Child pages are preserved.",
  recover: "Recover unsaved page",
  recovered: "Your unsaved draft is available in the page editor.",
  conflict:
    "A file or folder already occupies this path. Nothing will be overwritten.",
  missing: "The page or file no longer exists.",
  unsupported: "Only Markdown notes can have child notes.",
  invalidName: "Choose a valid folder name without reserved characters.",
  changed:
    "The file changed elsewhere. Your action was stopped to preserve those changes.",
  partial:
    "The operation could not be fully restored. Review the affected paths before continuing.",
  failure:
    "The operation failed. Your files have not been intentionally overwritten.",
  unsaved:
    "Could not save this page. The draft is retained; use Recover unsaved page to reopen it.",
  chooseRecovery: "No unsaved page drafts to recover.",
  recoveryHelp:
    "Copy the text below into a note. Drafts remain available even if their original folder was moved or deleted.",
  selectText: "Select text",
};
export type TextKey = keyof typeof en;
const zh: Record<TextKey, string> = {
  language: "语言",
  auto: "跟随 Obsidian",
  languageDescription: "选择 Branch Note 使用的界面语言。",
  newChild: "新建子笔记",
  untitled: "未命名",
  start: "开始书写",
  empty: "从这里，开始书写",
  emptyDescription:
    "这个目录还没有首页。点击“开始书写”，即可创建首页并打开编辑器。",
  placeholder: "写下第一句话……",
  done: "完成书写",
  saved: "已保存",
  saving: "正在保存……",
  retry: "重试保存",
  deleteHome: "删除首页",
  undo: "撤销上次页面操作",
  undone: "已撤销上次页面操作。",
  created: "已新建子笔记。",
  deleted: "首页已移至回收站，目录和子条目保留。",
  recover: "恢复未保存的页面",
  recovered: "已在页面编辑器中恢复未保存的草稿。",
  conflict: "目标路径已有文件或目录，操作已停止，不会覆盖。",
  missing: "页面或文件已不存在。",
  unsupported: "只有 Markdown 笔记可以创建子笔记。",
  invalidName: "请使用有效名称，不要包含路径符号或系统保留名称。",
  changed: "文件已被其他操作修改，本次操作已停止，以保留这些更改。",
  partial: "操作未能完整恢复，请检查相关路径后再继续。",
  failure: "操作失败，未主动覆盖任何已有文件。",
  unsaved: "页面保存失败，草稿已保留，可通过“恢复未保存的页面”重新打开。",
  chooseRecovery: "没有需要恢复的草稿。",
  recoveryHelp:
    "可复制下方文本并粘贴到笔记中。即使原目录已移动或删除，草稿仍会保留。",
  selectText: "选择全文",
};
export const text = (
  language: Exclude<Language, "auto">,
  key: TextKey,
): string => (language === "zh" ? zh : en)[key];
export function languageFrom(value: unknown): Language {
  return value === "zh" || value === "en" ? value : "auto";
}
export function resolveLanguage(
  language: Language,
  obsidianLanguage: string,
): Exclude<Language, "auto"> {
  return language === "auto"
    ? obsidianLanguage.toLowerCase().startsWith("zh")
      ? "zh"
      : "en"
    : language;
}
