# Progress：NotebookLM Conversation 导出 Markdown/PDF

## 2026-05-17
- 启动需求设计阶段。
- 读取并应用相关流程技能：brainstorming、planning-with-files-zh、writing-plans、apex-harness。
- 探索项目上下文：目录为空，不是 Git 仓库，无现有代码或文档约定。
- 建立规划文件：`task_plan.md`、`findings.md`、`progress.md`。
- 当前门禁：继续澄清需求并写 spec；在用户确认前不实现功能代码。
- 用户确认第一版产品形态为浏览器扩展。
- 用户确认第一版 Markdown 范围为结构化归档。
- 用户补充 NotebookLM conversation 历史记录是懒加载，需作为设计约束处理。
- 用户确认懒加载处理采用自动加载完整历史后再导出。
- 用户确认第一版公式处理采用基础 LaTeX 解析，失败时保留原文并标记。
- 用户确认 NotebookLM 页面样本位于 `html_tset/`，且该目录不要纳入 Git 跟踪。
- 已新增 `.gitignore`，包含 `html_tset/`。
- 已检查 `html_tset/`：包含一个保存的 NotebookLM HTML 和对应资源目录。
- 已从保存 HTML 提取结构摘要：发现 message、source、citation、KaTeX/math 相关 DOM 标记，支持 DOM-first 方案。
- 用户确认采用方案 1：DOM-first 浏览器扩展。
- 已写入正式 spec：`docs/specs/00_notebooklm_export_1_0.md`。
- spec 占位符扫描通过；确认 `html_tset/` 被 `.gitignore` 忽略。
- 用户目标更新为写完 spec 后直接实现并迭代测试到 1.0。
- 已创建 `package.json` 和 `scripts/verify-extension.js`。
- 已运行 `npm run build`，按预期失败并提示 `manifest.json is missing`，验证静态 verifier 能抓住缺失扩展 manifest。
- 已按 TDD 完成 Markdown renderer：先验证 `tests/renderer.test.js` 因缺少 `core.js` 失败，再实现 `renderMarkdown`，随后 renderer tests 通过。
- 已按 TDD 完成基础公式解析：先验证 `tests/formula.test.js` 因 `extractFormulaMarkdown` 缺失失败，再实现 annotation/display/fallback warning，随后 formula tests 通过。
- 已按 TDD 完成 DOM adapter 初版：先验证 `tests/dom-adapter.test.js` 因 `extractNotebookData` 缺失失败，再实现标题、来源、消息、引用和基础富文本 Markdown 抽取，随后 adapter test 通过。
- 已按 TDD 完成懒加载 loader：先验证 `tests/lazy-loader.test.js` 因 `loadFullHistory` 缺失失败，再实现稳定计数、滚动到顶部、超时和缺失容器路径，随后 lazy-loader tests 通过。
- 已创建 Manifest V3 扩展壳：`manifest.json`、content script、popup HTML/CSS/JS。
- 已补充 build verifier 对 `activeTab`、content scripts 和 popup 文件的静态检查。
- 已执行保存 NotebookLM HTML 的浏览器级抽取 smoke：抽取 28 条消息、28 个来源，生成 frontmatter、Conversation 和 Sources；修复了 source 分组误收问题。
- 已尝试真实 NotebookLM URL live smoke，但当前 Playwright 环境跳转 Google 登录页，无法完成登录态内导出验证。
- 已尝试 Chrome/Edge headless unpacked-extension 加载验证；当前环境中无扩展的 Chrome headless baseline 也因 GPU 进程失败退出，因此该项记录为环境边界，不作为扩展失败。
- 已新增 `README.md`，记录加载 unpacked extension、验证命令、fixture 策略和当前 live 验证边界。

## 验证记录
- `git status --short`：失败，原因是当前目录不是 Git 仓库。
- `rg --files`：未发现项目文件。
- 对保存 HTML 的宽泛关键词搜索输出过大并超时；后续改用结构摘要。
- `git status --short --ignored`：显示 `.gitignore`、docs 和规划文件未跟踪，`html_tset/` 已忽略。
- `git check-ignore -v html_tset`：命中 `.gitignore:1:html_tset/`。
- `Select-String` 占位符扫描：spec 未返回占位符。
- `npm run build`：失败，预期原因 `manifest.json is missing`。
- `node --test tests/renderer.test.js`：先失败于 `MODULE_NOT_FOUND`，实现后 2/2 tests pass。
- `node --test tests/formula.test.js`：先失败于 `extractFormulaMarkdown is not a function`，实现后 3/3 tests pass。
- `node --test tests/dom-adapter.test.js`：先失败于 `extractNotebookData is not a function`，实现后 1/1 tests pass。
- `node --test tests/lazy-loader.test.js`：先失败于 `loadFullHistory is not a function`，实现后 3/3 tests pass。
- `npm run build`：扩展静态 verifier 通过。
- `node --test tests/lazy-loader.test.js`：补充 loading indicator RED 后先失败于误判 `complete`，实现 loading 检测后 4/4 tests pass。
- 保存 HTML 浏览器 smoke：抽取结果 `messageCount=28`、`sourceCount=28`、`hasFrontmatter=true`、`hasSyntheticSourceFallback=false`。
- 真实 NotebookLM URL smoke：跳转到 `Sign in - Google Accounts`，因缺少登录态未完成 live 导出。
- Chrome/Edge headless extension-load：失败于 GPU process；Chrome no-extension baseline 同样失败，说明该 CLI 路径在当前环境不可用。

## 下一步
- 等待 1.1 spec 审阅确认后，按 `docs/plans/2026-05-18-structured-content-selection-export.md` 进入 TDD 实现。

## 2026-05-18
- 用户反馈 1.0 导出会丢失对话内部换行和结构化内容，需要按 Markdown/富文本结构组织并保留内部换行。
- 用户要求 popup/window UI 显示对话数量、DOM/历史加载是否完整，并支持默认全部导出或勾选导出。
- 已重新读取 1.0 spec、matrix、status、实现计划、核心代码、content script、popup 和测试，确认当前缺口：
  - `visibleText()`、`normalizeInline()` 和 `elementToMarkdown()` 会折叠消息体空白；
  - popup 只有单个导出按钮和状态文本；
  - content script 只有 `NOTEBOOKLM_EXPORT_MARKDOWN`，没有 scan/status 合约；
  - 当前没有 selection/filtering 模型。
- 已写入 1.1 spec：`docs/specs/01_structured_content_and_selection_export.md`。
- 已写入 1.1 matrix：`docs/matrix_notebooklm_export_1_1.md`。
- 已写入 1.1 TDD 实施计划：`docs/plans/2026-05-18-structured-content-selection-export.md`。
- 当前门禁：按 brainstorming 流程，先请用户审阅 spec；确认后再进入实现代码变更。
