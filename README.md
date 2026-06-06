<p align="center">
  <img src="https://s41.ax1x.com/2026/06/03/pmVJa4g.png" alt="BGM点格子" width="120" />
</p>

<h1 align="center">bgm-dot-grid · BGM 点格子</h1>

<p align="center">
  <strong>Bangumi 收藏进度管理 · 移动端友好的单页应用</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-v1.8.9-f09199" alt="版本" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/纯前端-无后端依赖-brightgreen" alt="纯前端" />
</p>

---

## 📖 简介

**BGM 点格子** 是一个基于 Bangumi API 的番剧收藏管理工具。

相比 Bangumi 官方界面，它专注于 **追番效率**：

- 🏠 **主页** — 卡片网格直观展示所有收藏条目
- 📊 **实时进度** — 每部番的已看集数 / 总集数一目了然
- 🟢 **绿色高亮** — 最近 7 天内播出的未看最新集自动高亮
- 📱 **移动优先** — 底部弹出的二级页面，单手持机操作舒适
- ⚡ **极速体验** — 批量 API 查询 + 增量渲染，告别逐集加载
- 🔧 **高度可配置** — API 端点、图片代理、显示选项均可自定义

---

## 🚀 快速开始

### 首次使用

1. 点击右上角 **⚙️** 打开设置
2. 在 [next.bgm.tv/demo/access-token](https://next.bgm.tv/demo/access-token) 获取你的 Access Token
3. 粘贴 Token，点击 「🔌 连接」
4. 等待数据加载完成即可开始使用

> 💡 **Token 仅存储在浏览器本地 localStorage 中**，不会上传到任何第三方服务器。

---

## ✨ 核心功能

### 🏠 主页

| 功能 | 说明 |
|------|------|
| **卡片网格** | 以 3 列（移动端）或自适应（桌面端）网格展示番剧封面 |
| **分类筛选** | 全部 / 想看 / 看过 / 在看 / 搁置 / 抛弃 |
| **进度标注** | `x/y(q)` — 已看 x / 总 y 集，在播番额外显示已播出 q 集 |
| **搜索** | 实时按标题搜索过滤 |
| **统计栏** | 顶部显示各分类条目数量 + 总体进度条 |
| **排序** | 默认 / 更新时间 / 评分 / 进度 / 标签 五种排序 |
| **加载条** | 顶部细条显示 API 请求状态 |

### 🎬 二级页面（剧集详情）

点击任意卡片打开，从底部弹出（移动端）：

| 功能 | 说明 |
|------|------|
| **剧集网格** | 显示该作品的所有剧集 |
| **观看状态** | 粉色 = 已看，灰色 = 未来播出，绿色（7天内）= 未看最新集 |
| **快速标记** | 点击任意集 → 菜单：「看过」「看到这里」「撤销」 |
| **状态切换** | 想看/看过/在看/搁置/抛弃 一键切换 |
| **看一集** | 一键标记下一集未看 |
| **评分 + 类型** | 显示 Bangumi 评分和风格标签 |
| **快捷跳转** | 点击海报跳转 Bangumi 详情页 |

### ⚙️ 设置

| 设置项 | 默认 | 说明 |
|--------|------|------|
| **Access Token** | — | Bangumi API 认证 |
| **API 端点** | `https://api.bgm.tv/v0` | 支持自定义 |
| **Bangumi 主站** | `https://bgm.tv` | 跳转详情页时使用 |
| **图片代理前缀** | 留空 | 解决封面图跨域问题 |
| **显示状态标签** | 开启 | 卡片左上角的「在看」「想看」等 |
| **显示更新时间** | 开启 | 在播番封面显示「周X」 |
| **显示评分** | 关闭 | 封面右下角显示 ⭐ 评分 |
| **显示操作说明** | 开启 | 二级页面底部的提示文字 |

---

## 🖼️ 界面预览

<p align="center">
  <strong>移动端</strong><br />
  <img src="https://s41.ax1x.com/2026/06/07/pmmijV1.png" alt="移动端主页" width="300" />
  <img src="https://s41.ax1x.com/2026/06/07/pmmiLr9.png" alt="移动端二级页面" width="300" />
</p>

<p align="center">
  <strong>PC 端</strong><br />
  <img src="https://s41.ax1x.com/2026/06/07/pmmivUx.png" alt="PC端主页" width="600" />
  <br />
  <img src="https://s41.ax1x.com/2026/06/07/pmmiObR.png" alt="PC端二级页面" width="600" />
</p>

---

## 🔗 API 请求说明

应用完全基于 Bangumi API v0，以下是所有请求的完整说明。

### 首页加载

打开页面时自动发起（阻塞）：

```
GET /me
```
- **用途**：验证 Access Token 有效性，获取当前用户信息
- **触发时机**：连接 Token 时 / 页面刷新自动登录
- **频率**：每次页面加载 1 次
- **返回**：用户 ID、昵称、头像

```
GET /users/{uid}/collections?subject_type=2&type=3&limit=50
```
- **用途**：获取「在看」分类的收藏列表
- **触发时机**：登录成功后
- **频率**：每次页面加载 1 次（多页则 50 条/页依次请求）
- **返回**：条目列表（含评分、标签、集数进度）
- **备注**：type=3 表示「在看」

### 切换分类

点击筛选栏按钮时发起：

```
GET /users/{uid}/collections?subject_type=2&type={typeCode}&limit=50&offset={offset}
```
- **用途**：切换或首次加载某一分类的条目
- **typeCode**：1想看 / 2看过 / 3在看 / 4搁置 / 5抛弃
- **触发时机**：点击分类按钮且该分类未加载过
- **备注**：每页 50 条，返回后立即**增量渲染**到页面，非串行等待

### 后台预加载

登录成功后自动在后台发起（不阻塞操作）：

```
GET /users/-/collections/{subject_id}/episodes?limit=500
```
- **用途**：批量获取一部作品的所有剧集列表 + 每集观看状态
- **触发时机**：登录后对每部「在看」作品逐个请求（并发 3 个）
- **频率**：每部「在看」作品 1 次，仅首次登录时
- **返回**：剧集列表（含 id、sort、airdate）+ 每集是否已看（type=2）
- **备注**：这是最重要的优化请求——同时拿了列表和状态

### 打开二级页面

点击卡片时发起：

```
GET /users/-/collections/{subject_id}/episodes?limit=500
```
- **用途**：获取该作品的剧集列表 + 观看状态
- **触发时机**：点击卡片打开详情
- **备注**：如果后台预加载已完成，则**零请求**直接使用缓存

### 标记单集

点击「看过」「看到这里」「撤销」时发起：

```
PUT /users/-/collections/-/episodes/{episode_id}
```
- **Body**：`{"type": 2}`（看过）或 `{"type": 0}`（撤销）
- **触发时机**：点击任意操作菜单项
- **频率**：每次标记 1 次请求

当标记后满足条件（如看完所有集）时，额外发起：

```
PATCH /users/-/collections/{subject_id}
```
- **Body**：`{"type": {statusCode}}`
- **用途**：自动变更条目收藏状态（如在看 → 看过）
- **触发时机**：看完最后 1 集时

### 同步

点击「↻ 同步」按钮时发起：

对当前分类重新拉取全量数据，流程同首页加载 + 切换分类。

### 全局设置保存

点击「💾 保存」时：

```
HEAD {apiEndpoint}
```
- **用途**：可选，通过 Ping 按钮测试端点连通性
- **触发时机**：手动点击 📡 按钮

---

## 🔧 自定义指南

### 修改主题色

在 CSS `:root` 中修改 `--primary` 变量即可全局更换主题色：

```css
:root {
  --primary: #f09199;  /* 改为你喜欢的颜色 */
}
```

### 添加自定义 API 端点

在设置页面的「网络」区域修改，支持任何兼容 Bangumi API v0 规范的端点，如：
- `https://api.bgm.tv/v0`（官方）
- `https://api.bangumi.one/v0`（社区镜像）

---

## 📄 许可

MIT License

## 🙏 致谢

- [Bangumi](https://bgm.tv) — 番组计划
- [Bangumi API](https://bangumi.github.io/api/) — API 文档

---

<p align="center">
  <sub>Powered By July · 本项目代码由 DeepSeek AI 提供</sub>
</p>
