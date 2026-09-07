# 发布与维护

本项目通过公共仓库 [elfmedy/branch-note](https://github.com/elfmedy/branch-note) 的 GitHub Releases 提供安装包，支持 Obsidian 社区目录和 BRAT。当前版本 **0.1.2**。

## Obsidian 社区目录

按[官方提交流程](https://docs.obsidian.md/plugins/releasing/submit-plugin)，通过社区网站提交与管理条目，不另外创建 GitHub 上架 PR。

- [市场条目](https://community.obsidian.md/plugins/branch-note)
- [管理与自动审核](https://community.obsidian.md/account/plugins/branch-note)

2026-09-07：**0.1.2** 已发布，自动审核状态 **Completed**，未显示错误或警告。Release 来源证明、网络行为、依赖检查均通过；市场成功从源码逐字节复现 `main.js`。分类为 **Folders / Files**。

首次提交选择仓库 `elfmedy/branch-note`，确认开发者规范和维护声明，核对英文简介与分类，再发布条目。检查自动审核是否完成、有无阻断错误，以及发布附件是否可从源码逐字节复现。发布条目和通过审核是不同状态，两者都应确认。应用内搜索暂未同步不意味着需要另发插件版本。

如果审核发现代码问题，修复后递增版本并发布新的 GitHub Release，在管理页检查新版。只修改市场文案或仓库文档时无需重新发布相同的插件代码。人工复核仅在有实际复核需求时使用。

## 发布检查

1. 使用 Node.js 24 LTS，执行 `npm ci`、`npm run check`：类型检查、官方 Obsidian lint、核心测试、生产构建及版本/产物校验。
2. 在 Obsidian Sandbox 中按 `VALIDATION.md` 重跑受影响的原生交互，并检查 `COMPATIBILITY.md` 中的已验证范围。
3. 同步 manifest、package、lockfile 版本及 `versions.json`。更新 README、CHANGELOG、RELEASE_NOTES 和验证记录。
4. 标签严格使用版本号（例如 `0.1.1`），不加 `v`。推送版本标签后，GitHub Actions 必须检查通过，才会创建 Release。

## Release 工作流

`.github/workflows/release.yml` 在分支和 PR 上检查，在版本标签上发布。它通过构建检查后生成 artifact attestation，并发布三个独立资产：`main.js`、`manifest.json`、`styles.css`。正文来自 `RELEASE_NOTES.md`。

三个资产必须位于 Release 根级，不能只上传 zip 或嵌套 dist 目录。BRAT 读取 Release 中的 manifest 和脚本；仓库根目录不需要提交编译后的 main.js。

发布后检查 [Actions](https://github.com/elfmedy/branch-note/actions) 和 [最新 Release](https://github.com/elfmedy/branch-note/releases/latest)，下载资产并核对校验和，验证证明：

```sh
gh release download 0.1.1 --repo elfmedy/branch-note
gh attestation verify main.js --repo elfmedy/branch-note
```

在 BRAT 中添加 `elfmedy/branch-note`，选择最新版本安装，并检查是否正确加载。

## 源码与安装包

本目录就是独立仓库根目录。不要提交网页原型、vault 内容、用户排序文件、data.json、node_modules、test-results、dist 或 packages。`.gitignore` 排除开发产物和本地数据。

Windows PowerShell 中可执行以下命令生成额外的手动分发包：

```powershell
npm run check
./scripts/package.ps1
```

脚本生成安装 zip、允许清单内的源码 zip 和 SHA-256 清单。这些 zip 不替代 GitHub Release 上的三个独立插件文件。
