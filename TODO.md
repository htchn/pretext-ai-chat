# TODO

## Phase 1: 核心可用（先跑起来）

目标：一个能聊天的基本产品，还没接 Pretext 优化。

### 1.1 项目初始化
- [x] Vite + Preact 项目脚手架
- [x] 安装依赖：`@chenglou/pretext`, `lucide-preact`
- [x] `index.html` 加载 Google Fonts（Inter 400/500/600, JetBrains Mono 400）
- [x] `global.css`：CSS 变量（亮色 + 暗色配色）、reset、字体声明
- [x] 确认 `npm run dev` 能跑起来

### 1.2 整体布局
- [x] `App.jsx`：Sidebar + Main Area 的 flex 布局
- [x] Sidebar 骨架：logo 区、对话列表区、底部图标区
- [x] Main Area 骨架：消息区 + 底部输入栏
- [x] 侧边栏折叠/展开

### 1.3 主题切换
- [x] `useTheme` hook：读写 localStorage，切换 `<html>` 上的 class
- [x] 侧边栏底部放主题切换图标（太阳/月亮）
- [x] 验证亮色/暗色模式下所有组件颜色正确

### 1.4 设置面板
- [ ] Settings 组件：API Key 输入框（密码模式，可切换显示）
- [ ] 模型选择下拉（预设：gpt-4o, gpt-3.5-turbo, claude-sonnet）
- [ ] API provider 选择（OpenAI / Anthropic）
- [ ] 存储到 localStorage

### 1.5 基本 Chat 功能
- [ ] InputBar：多行文本框，Shift+Enter 换行，Enter 发送
- [ ] 发送按钮：accent 色圆形，未输入时 disabled
- [ ] 消息列表：用户消息右对齐 + AI 消息左对齐
- [ ] OpenAI 流式 API 调用（SSE 解析）
- [ ] 流式输出：逐 token 追加显示
- [ ] 流式光标闪烁动画（竖线，800ms 周期）
- [ ] 未配置 API Key 时的友好提示

### 1.6 对话管理
- [ ] 新建对话
- [ ] 对话列表显示在侧边栏（标题取第一条消息前 20 字）
- [ ] 点击切换对话
- [ ] 对话数据存储到 localStorage

---

## Phase 2: Pretext 加持（核心差异点）

目标：接入 Pretext，让 Chat 体验从"能用"变成"丝滑"。

### 2.1 Pretext 引擎封装
- [ ] `pretext-engine.js`：封装 prepare / layout / shrinkwrap 高层 API
- [ ] 确保 font string 与 CSS 声明一致（`'14px Inter'` + line-height 22.4px）
- [ ] 基本测试：给一段文本，输出正确的高度

### 2.2 流式零抖动
- [ ] 修改 StreamingMessage：每个 token 到达前用 Pretext 预算高度
- [ ] 先设容器高度，再写入文本
- [ ] 验证：流式输出时页面不再跳动
- [ ] 自动滚动到底部保持跟随

### 2.3 Shrinkwrap 智能气泡
- [ ] 实现 shrinkwrap 函数：二分查找最窄宽度（保持行数不变）
- [ ] Message 组件接入：AI 消息气泡宽度由 shrinkwrap 决定
- [ ] 用户消息同样适用
- [ ] 验证：短消息气泡明显比之前窄，长消息不变

### 2.4 虚拟列表
- [ ] MessageList 改为虚拟滚动
- [ ] 所有消息用 Pretext `layout()` 预算高度，存入 heights 数组
- [ ] 只渲染可视区域 ± buffer 的消息 DOM
- [ ] 滚动时根据 heights 精确计算 translateY
- [ ] 验证：加载 1000+ 条消息，滚动依然流畅

---

## Phase 3: Benchmark + 收尾

目标：加入验证工具，完善产品，准备部署。

### 3.1 Benchmark 模式
- [ ] 侧边栏底部加实验室图标（Flask / Beaker from Lucide）
- [ ] Hover 提示 "Rendering Lab"
- [ ] BenchView 布局：控制栏 + 左右分屏 + 指标面板
- [ ] 左侧面板：原生 DOM 渲染（textContent += token）
- [ ] 右侧面板：Pretext 渲染（预算高度后写入）
- [ ] Token 速度滑块（5-80 token/s，默认 30）
- [ ] 预设文本样本切换按钮（中文 / 英文 / 中英混排）

### 3.2 指标采集
- [ ] CLS 采集：PerformanceObserver 监听 layout-shift
- [ ] Reflow 计数：手动统计 offsetHeight 读取次数
- [ ] FPS 计算：requestAnimationFrame 帧间隔
- [ ] MetricCard 组件：实时显示，红/绿色区分好坏

### 3.3 预设文本样本
- [ ] 样本 1：中文 AI 问答（200-300 字，有段落）
- [ ] 样本 2：英文技术回答（200-300 words，含代码标记）
- [ ] 样本 3：中英混排 + Emoji

### 3.4 数据持久化完善
- [ ] 对话历史完整存储/恢复
- [ ] 删除对话功能
- [ ] 设置偏好持久化（主题、上次选择的模型）

### 3.5 部署
- [ ] `npm run build` 确认产出正常
- [ ] GitHub repo 创建（htchn/pretext-display 或最终产品名）
- [ ] GitHub Pages 部署配置（vite.config.js 设置 base）
- [ ] 验证线上可访问

### 3.6 README
- [ ] 项目简介 + 截图/GIF
- [ ] 技术亮点说明（四个 Pretext 功能）
- [ ] 本地运行说明
- [ ] 在线 Demo 链接

---

## Phase 4: 加分项（时间允许再做）

- [ ] 消息 Markdown 渲染（加粗、代码块、列表）
- [ ] 代码块语法高亮
- [ ] 导出对话为 Markdown 文件
- [ ] Anthropic Claude API 接入
- [ ] Benchmark 结果截图/导出
- [ ] 移动端基础适配
- [ ] 消息复制按钮
- [ ] 重新生成回答按钮
