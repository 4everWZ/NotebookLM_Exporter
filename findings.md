# Findings：NotebookLM Conversation 导出 Markdown/PDF

## 仓库现状
- 路径：`D:\Code\JavaScript\NotebookLM_Export`
- 当前目录最初为空；当前已新增规划文件和 `.gitignore`。
- 当前目录不是 Git 仓库，无法读取近期提交或沿用已有项目约定。
- 当前没有 `docs/`、package 配置、测试框架或浏览器扩展结构。
- `.gitignore` 已包含 `html_tset/`，用于避免保存的 NotebookLM 页面样本进入 Git。

## 用户目标理解
- 构建一个 NotebookLM conversation 导出工具。
- 先设计并写出 spec，对齐后再实现。
- 第一版形态：浏览器扩展。
- 第一版优先实现 Markdown 导出，范围为结构化归档：标题、用户问题、NotebookLM 回答、角色顺序、来源引用、列表、代码块、表格、基础 frontmatter。
- PDF 导出作为后续扩展。
- 第一版公式处理采用基础 LaTeX 解析：识别常见 inline/block 公式，输出 LaTeX 友好的 Markdown；解析失败时保留原文并标记。
- Gemini/Voyager 公式复制格式作为后续增强参考，而不是阻塞第一版 Markdown 导出。
- NotebookLM conversation 历史记录存在懒加载，导出流程必须处理“未加载历史消息”的完整性风险。
- 第一版需要自动加载完整 conversation 历史：导出前滚动历史容器、等待新增消息渲染，直到达到稳定状态，再生成 Markdown。
- NotebookLM 页面样本由用户提供，位于 `html_tset/`。

## 已确认决策
- 产品形态采用浏览器扩展，而不是用户脚本、书签脚本或本地 CLI。
- 初步架构方向应包含 content script 读取 NotebookLM 页面、扩展 UI 触发导出、后台/页面侧生成并下载 Markdown。
- Markdown 第一版采用结构化归档范围，而不是最小文本导出或高保真全量排版。
- 懒加载历史记录必须进入核心设计，而不是实现细节或后续优化。
- 懒加载策略采用自动完整加载，而不是要求用户手动滚动或只导出当前可见内容。
- 公式解析采用“基础支持 + 可观测失败回退”：不静默丢公式，不因未知格式中断整份导出。
- 保存页面样本目录 `html_tset/` 不纳入 Git 跟踪。
- 第一版采用 DOM-first 浏览器扩展方案；不以剪贴板复制或内部网络/API 探测作为主路径。

## 初步风险与未知
- NotebookLM DOM 结构和复制内容格式可能随版本变化，需要 fixture 或 Playwright 采样验证。
- 懒加载会导致单次 DOM 抽取只能看到当前已渲染 conversation 片段；第一版需要自动加载策略、完整性状态和超时/失败提示。
- 如果依赖登录态抓取 NotebookLM 页面，需要用户提供已保存页面或授权使用本地浏览器会话。
- 公式处理可能涉及多来源格式：DOM 中的 MathJax/KaTeX/HTML、剪贴板 HTML、纯文本复制结果、Gemini/Voyager 特定标记。
- 第一版不应承诺完整兼容 Gemini/Voyager 的所有复制格式；该方向需要后续样本驱动研究。
- Markdown 与 PDF 的排版目标不同，应避免第一版把 PDF 排版需求压进 Markdown 核心。
- 保存的 NotebookLM HTML 约 2.58 MB，包含 NotebookLM 页面标题、保存来源 URL、Angular/Material DOM、source 列表和大量脚本/样式；需要提取结构摘要而不是直接全文搜索。
- 直接对单行压缩 HTML 做宽泛关键词搜索会输出过大并超时，后续分析应使用受限正则或专用 fixture 摘要。

## 样本 DOM 结构线索
- 保存页面包含可用于第一版抽取的结构性 class：`chat-message-pair`、`individual-message`、`from-user-message-card-content`、`to-user-message-card-content`、`message-text-content`、`message-actions`、`citation-marker`、`citation-tooltip-panel`、`single-source-container`、`source-title`。
- 保存页面包含自定义元素/标签线索：`chat-message`、`mat-card`、`mat-card-content`、`mat-card-actions`、`source-discovery-*`。
- 关键词计数显示页面中存在大量 `source`、`citation`、`message`、`katex`、`math` 标记，支持将来源引用、消息结构和基础公式解析纳入第一版。
- ARIA 线索包含“将模型回答复制到剪贴板”“显示其他引用”“对话选项”“将对话面板滚动到底部”等，可作为辅助定位，但不应作为唯一稳定契约。
- 设计含义：第一版应采用 DOM 适配层，集中维护 NotebookLM 选择器和回退策略；导出业务逻辑只消费规范化后的 conversation model。

## 待确认问题
- DOM-first 架构细节需用户确认后写入正式 spec。
