# Git 约定（Pro_WearWhat）

- **远端只使用 GitHub**：本项目的推送目标是 GitHub（SSH：`git@github.com:CuicuiZz665/Pro_WearWhat.git`，注意仓库名大小写敏感）。
- **不推送到 Gitee**：用户已明确本仓库不使用 Gitee（Office Me 项目的 Gitee 约定不受影响）。
- **分支**：主分支 `main`，直接推送 `origin main`。
- **禁止提交**：`.env.local`（含 ZHIPU_API_KEY）、`node_modules/`、`dist/`（`.gitignore` 已覆盖，提交前仍需复核）。
- **提交信息**：中文，`类型: 描述` 风格（feat / fix / chore / docs），与仓库历史保持一致。
