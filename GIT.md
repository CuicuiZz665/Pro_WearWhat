# Git 约定（Pro_WearWhat）

- **远端只使用 GitHub**：本项目的推送目标是 GitHub（SSH：`git@github.com:CuicuiZz665/Pro_WearWhat.git`，注意仓库名大小写敏感）。
- **不推送到 Gitee**：用户已明确本仓库不使用 Gitee（Office Me 项目的 Gitee 约定不受影响）。
- **分支**：主分支 `main`，直接推送 `origin main`。
- **禁止提交**：`.env.local`（含 ZHIPU_API_KEY）、`node_modules/`、`dist/`（`.gitignore` 已覆盖，提交前仍需复核）。
- **提交信息**：中文，`类型: 描述` 风格（feat / fix / chore / docs），与仓库历史保持一致。
- **远端说明**：`origin` 与 `github` 两个远端目前指向同一 GitHub 仓库（历史遗留，暂保留）；推送一律使用 `origin`。

## 版本与发布约定（2026-11-24 追加）

- **版本号**：遵循语义化版本，0.x 阶段——新功能里程碑升次版本号（v0.2.0 → v0.3.0），修复与文档升修订号；`package.json` 的 version 与最新 Tag 保持一致。
- **CHANGELOG**：变更随手记入 `CHANGELOG.md` 的 Unreleased 段；定版时把 Unreleased 改为版本号与日期，提交 `chore: release vX.Y.Z`，并同步 `package.json` 的 version。
- **Tag**：只打在 `main` 上、且只打在 `npm run build` 通过的提交；使用附注标签 `git tag -a vX.Y.Z -m "一句话说明"`；推送 `git push origin main --tags`。已发布的 Tag 不改写、不删除重发，发现问题发新版本。
- **Release**：基于已推送的 Tag 在 GitHub 创建 Release，标题 `vX.Y.Z`，正文粘贴 CHANGELOG 对应版本段落。
- **历史说明**：v0.1.0（`7fc7605`）与 v0.2.0（`31fe6a3`）为 2026-11-24 事后追溯整理的历史版本锚点，当时均未正式发布；补标 Tag 时分别指向各自的历史提交，不全部指向最新提交。补标前仓库无任何 Tag/Release；v0.3.0（AI 识别质量评测）暂定为规划，未发布。
