# 任务计划：NotebookLM Conversation 导出 Markdown/PDF

## 目标
先完成可评审的功能与技术 spec，对齐后再进入实现；第一阶段实现 NotebookLM conversation 到 Markdown 的导出，PDF 与公式复制/LaTeX 解析作为后续扩展设计。

## 当前阶段
阶段 7 complete

## 各阶段

### 阶段 1：需求与发现
- [x] 理解用户意图：先设计 spec，不直接实现
- [x] 探索项目上下文：当前目录为空，且不是 Git 仓库
- [x] 确认产品形态、输入来源、导出范围和公式处理目标
- [x] 将发现记录到 findings.md
- **状态：** complete

### 阶段 2：方案设计
- [x] 提出 2-3 个可行实现路径及取舍
- [x] 确定第一版 Markdown 导出范围
- [x] 确定后续 PDF 和公式解析边界
- [x] 确认 DOM-first 浏览器扩展架构设计
- **状态：** complete

### 阶段 3：Spec 写作
- [x] 写入 docs/specs 中的可评审 spec
- [x] 自查占位符、矛盾、范围漂移和歧义
- [x] 用户确认继续实现到 1.0
- **状态：** complete

### 阶段 4：实现计划
- [x] 使用 writing-plans 生成实现计划
- [x] 先计划 Markdown 导出实现
- [x] 将 PDF/公式增强拆成后续任务
- **状态：** complete

### 阶段 5：实现与验证
- [x] 按确认后的实现计划逐步编码
- [x] 使用样例 NotebookLM 页面或 DOM fixture 验证导出
- [x] 补充针对 Markdown 结构和公式解析的测试
- [x] 完成 1.0 审计并记录当前环境边界
- **状态：** complete

### 阶段 6：1.1 结构化内容与选择导出实现
- [x] 梳理 1.0 中消息内部换行和富文本结构丢失的原因
- [x] 写入 1.1 spec，覆盖结构化 Markdown、popup 状态、计数、全部/勾选导出
- [x] 写入 1.1 spec-to-implementation matrix
- [x] 写入 1.1 TDD 实施计划
- [x] 按 TDD 实现结构化 Markdown 抽取、scan 状态和全部/勾选导出
- [x] 同步 README、matrix、status 和进度文档
- [x] 完成本地测试、build 和保存 HTML smoke 验证
- **状态：** complete

### 阶段 7：1.2 手动 Scan 与 UAV 富文本错位修复
- [x] 复现 `html_tset` UAV 导出中 heading/table 被压平成行内管道文本的问题
- [x] 确认根因是 NotebookLM 自定义结构 wrapper 未被当作 block container
- [x] 用 RED 测试覆盖 NotebookLM structural wrappers 下的 heading/table 导出
- [x] 用 static verifier RED 覆盖 popup 不应自动 scan、必须有 Scan 按钮
- [x] 实现透明 block wrapper、NotebookLM heading 识别和 popup 手动 Scan
- [x] 同步 1.2 spec、matrix、status、README 和版本号
- [x] 完成 popup manual-scan smoke、完整验证和提交
- **状态：** complete

## 关键问题
1. 第一版产品形态是浏览器扩展、用户脚本/书签脚本、还是 CLI/本地网页解析器？已确认：浏览器扩展。
2. 第一版 Markdown 应覆盖哪些 conversation 内容：问答文本、来源引用、时间/角色、图片/表格、公式？已确认：结构化归档范围，包含标题、问答正文、角色顺序、来源引用、列表/代码块/表格、基础 frontmatter。
3. NotebookLM 页面样本由用户提供保存网页，还是用 Playwright 在登录环境中采样？已确认：用户提供保存页面，位于 `html_tset/`，该目录不得纳入 Git 跟踪。
4. Gemini/Voyager 公式复制格式是作为兼容目标、参考实现，还是后续研究项？已确认：第一版做基础 LaTeX 解析，常见 inline/block 公式尽量转 LaTeX，失败时保留原文并标记；Gemini/Voyager 复制格式作为后续增强参考。

## 已做决策
| 决策 | 理由 |
|------|------|
| 先写 spec，不实现功能代码 | 用户明确要求先设计并对齐 |
| 当前任务按 Tier B 处理 | 涉及导出行为、DOM/格式契约和后续扩展，但尚未进入 correctness-critical 实现 |
| 规划文档放在项目根目录 | 当前目录为空，没有已有文档拓扑 |
| 第一版产品形态采用浏览器扩展 | 用户确认选项 A；适合直接读取 NotebookLM 当前页面 DOM 并提供导出入口 |
| 第一版 Markdown 采用结构化归档范围 | 用户确认选项 B；兼顾阅读、归档和后续 PDF/再处理 |
| NotebookLM conversation 历史懒加载是核心约束 | 用户特别提醒；导出流程必须避免只导出当前已渲染片段而不提示 |
| 第一版自动加载完整 conversation 历史后再导出 | 用户确认懒加载策略 A；扩展需滚动/等待直到检测不到新增消息 |
| 第一版公式处理采用基础 LaTeX 解析与失败回退 | 用户确认选项 B；支持常见 inline/block 公式，不让公式解析失败阻断 Markdown 导出 |
| NotebookLM 样本从 `html_tset/` 读取且不跟踪进 Git | 用户确认选项 A 并明确要求该目录不纳入 Git |
| 第一版采用 DOM-first 浏览器扩展方案 | 用户确认方案 1；运行时读取 NotebookLM 页面 DOM，样本 HTML 用作 fixture 和测试依据 |
| 1.1 选择导出的单位采用单条 normalized message | 与现有数据模型和“几条对话”计数一致；问答对分组可作为后续 UI 增强 |
| 1.1 popup 先 scan 再 export | 需要展示消息数、source 数和 DOM 完整性；导出时仍重新扫描以避免 stale DOM |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| git status 失败：当前目录不是 Git 仓库 | 1 | 记录现状；后续 spec 提交步骤需等用户决定是否初始化 Git |
| 对保存 HTML 直接搜索输出过大并超时 | 1 | 改用受限正则/结构摘要，不输出整页内容 |
| Playwright live NotebookLM smoke 跳转 Google 登录页 | 1 | 记录为当前环境缺少登录态的硬边界；使用用户提供保存 HTML 完成 DOM 抽取 smoke |
| Chrome/Edge headless CLI 加载扩展失败 | 3 | 无扩展 baseline 同样因 GPU process 失败，记录为当前环境 headless 浏览器边界 |

## 备注
- 不在 spec 对齐前写功能代码。
- 外部网页内容只记录到 findings.md，不写入 task_plan.md。
- 1.0 代码、测试、build、保存 HTML smoke 已完成；live 登录态导出需用户在本地加载扩展后手动运行。
