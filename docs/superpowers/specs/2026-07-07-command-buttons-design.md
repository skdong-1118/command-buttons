# Command Buttons — VSCode 插件设计

## 概述

一个 VSCode 侧边栏插件，提供类似 SecureCRT 按钮栏的功能：点击按钮向当前活动终端发送预设命令文本并执行。

## 核心功能

- 侧边栏按钮列表，标签文字为主，可选图标
- 点击按钮 → 向当前活动终端发送文本 + 换行执行
- 支持分组（可折叠）
- 支持 JSON 配置 + 设置 UI 编辑
- 全局配置 + 工作区配置合并显示
- 同时注册 VSCode 命令，可从命令面板（Cmd+Shift+P）触发

## 架构

```
command-buttons/
├── src/
│   ├── extension.ts          # 入口：注册 TreeView、命令、配置监听
│   ├── tree/
│   │   ├── provider.ts       # TreeDataProvider：构建树结构
│   │   └── items.ts          # TreeItem：分组节点 + 按钮叶子节点
│   ├── config/
│   │   ├── types.ts          # 配置类型定义
│   │   ├── loader.ts         # 全局 settings + 工作区 .vscode/command-buttons.json 合并
│   │   └── validation.ts     # 配置校验
│   └── commands/
│       └── sendText.ts       # 向终端发送文本的核心命令
├── package.json              # 插件清单 + contributes（含 settings JSON Schema）
└── tsconfig.json
```

### 模块职责

| 模块 | 职责 |
|------|------|
| `extension.ts` | 插件入口，注册 TreeView、命令、配置变更监听 |
| `tree/provider.ts` | 实现 TreeDataProvider，从配置层读取按钮列表，构建树节点 |
| `tree/items.ts` | GroupItem（可折叠分组）和 ButtonItem（按钮叶子），实现点击行为 |
| `config/types.ts` | 按钮配置的 TypeScript 类型定义 |
| `config/loader.ts` | 读取全局 settings + 工作区 `.vscode/command-buttons.json`，按 id 合并 |
| `config/validation.ts` | 校验配置 schema，标记错误 |
| `commands/sendText.ts` | 核心逻辑：获取当前活动终端 → `terminal.sendText(text, true)` |
| `settings/editor.ts` | 为 VSCode settings UI 提供 JSON Schema 描述 |

## 配置格式

### 全局配置

位于 VSCode settings.json 的 `commandButtons.buttons` 字段。

### 工作区配置

位于工作区根目录 `.vscode/command-buttons.json`。

### 数据结构

```json
{
  "version": 1,
  "buttons": [
    {
      "id": "build-project",
      "label": "构建项目",
      "icon": "$(gear)",
      "command": "npm run build",
      "group": "开发",
      "tooltip": "执行 npm run build"
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 唯一标识，用于命令面板注册（自动加 `commandButtons.` 前缀） |
| `label` | 是 | 按钮显示文字 |
| `command` | 是 | 发送到终端的文本 |
| `group` | 否 | 分组名，`null` 或不填 = 未分组 |
| `icon` | 否 | VSCode Codicon 图标名（如 `$(gear)`） |
| `tooltip` | 否 | 悬停提示，默认显示 command 内容 |

### 合并规则

1. 以全局配置为基础，工作区配置按 `id` 覆盖/追加
2. 未分组按钮排在最前面
3. 分组按名称字母序排列
4. 组内按钮按配置顺序排列

## 行为

### 按钮点击

1. 获取当前活动终端（`window.activeTerminal`）
2. 若无活动终端，自动创建一个
3. 调用 `terminal.show()` 聚焦终端
4. 调用 `terminal.sendText(command, true)` — `true` 表示追加换行（执行）

### 分组折叠

- 使用 TreeView 的 `collapsibleState` 实现
- 初始状态为展开
- 折叠/展开状态由 TreeView 自动管理

### 命令面板

- 每个按钮注册一个命令：`commandButtons.run.<button-id>`
- 从命令面板选择即可触发，无需鼠标

### 错误处理

- 配置格式错误时，在侧边栏显示错误提示节点
- 缺失 id/label/command 的按钮跳过不渲染，不影响其他按钮
- 终端操作失败时显示 VSCode 错误通知

## 技术选型

- **语言**：TypeScript
- **UI**：TreeView API（原生，无 WebView）
- **打包**：vsce（VSCode Extension CLI）
- **依赖**：仅 VSCode API，无第三方运行时依赖

## 边界与范围

### 包含

- 侧边栏按钮列表
- 全局 + 工作区配置合并
- 分组折叠
- 命令面板集成
- 配置 JSON Schema 用于 settings UI 编辑

### 不包含

- 按钮自定义颜色/样式（使用 VSCode 主题色）
- 按钮拖拽排序（按配置文件顺序，后续可加）
- 按钮执行结果追踪（纯发文本，不关心终端输出）
- 多选终端实例（只发当前活动终端）
- WebView 自定义 UI
