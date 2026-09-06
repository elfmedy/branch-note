(async () => {
  if (app.vault.getName() !== "Obsidian Sandbox") throw new Error("Sandbox only");
  const root = "Branch Note 示例";
  const plugin = app.plugins.plugins["branch-note"];
  if (!plugin) throw new Error("Enable Branch Note first");
  let created = false;
  if (!app.vault.getAbstractFileByPath(root)) {
    await app.vault.createFolder(root);
    await app.vault.create(`${root}/${root}.md`, "# Branch Note\n\n让一篇笔记，自然长出子笔记。\n\n## 可以这样试用\n\n- 点击 **空白页面**：显示“开始书写”，点击按钮即创建首页并打开原生编辑器。\n- 右键 **一篇普通笔记** → **新建子笔记**：原文成为父级首页，新建的子笔记仍是普通文件。\n- 右键 **空白笔记** → **新建子笔记**：空白原文成为空首页，点击目录直接打开原生编辑器。\n- 点击 **项目笔记**：直接打开已有首页；点击左侧箭头展开子笔记。\n- 重命名 **项目笔记**：目录和首页文件名一起修改。\n- 右键目录 → **删除首页**：只删除首页，子笔记保留；原生“删除”和 Delete 键仍可删除整个目录。\n- 命令面板 → **Branch Note: 撤销上次页面操作**：撤销最近的新建、重命名或删除首页。\n\n设置中只有语言选项，支持中文和 English。\n");
    await app.vault.createFolder(`${root}/空白页面`);
    await app.vault.createFolder(`${root}/项目笔记`);
    await app.vault.create(`${root}/项目笔记/项目笔记.md`, "# 项目笔记\n\n这里是原生 Markdown 编辑器中的目录首页。\n\n这个文件的实际路径是 `项目笔记/项目笔记.md`，同名首页自动识别，不需要特殊创建方式。\n\n左侧只显示目录条目和子笔记，不重复显示首页文件。\n");
    await app.vault.create(`${root}/项目笔记/待办.md`, "# 待办\n\n- [ ] 试试新建子笔记\n- [ ] 试试重命名父级\n");
    await app.vault.create(`${root}/一篇普通笔记.md`, "# 一篇普通笔记\n\n这段文字会在新建子笔记后原样保留，成为父级首页。\n\n右键左侧条目，选择“新建子笔记”即可。\n");
    await app.vault.create(`${root}/空白笔记.md`, "");
    created = true;
  }
  const explorer = app.workspace.getLeavesOfType("file-explorer")[0]?.view;
  plugin.refresh();
  explorer?.revealInFolder(app.vault.getAbstractFileByPath(`${root}/空白页面`));
  await plugin.openFolder(`${root}/空白页面`, true);
  return { created, folder: root, enabled: [...app.plugins.enabledPlugins] };
})();
