---
name: novel-writer
description: 在本机 localhost 启动「AI小说自动创作系统」网页（书架、多部小说、原稿工作台、从任一章改写后续），并可直接阅读和修改保存在本地的小说章节。用户说要写小说、打开小说创作系统/写作工作台、续写或修改本地小说章节时使用。
---

# AI小说自动创作系统（本地版）

这个 skill 自带完整网页（`app/`）和一个无需安装依赖的本地服务器（`scripts/server.js`，需要 Node.js 18 或更高版本）。

## 启动

1. 检查是否已经在运行：`curl -s http://localhost:3000/api/ping`。返回 `{"ok":true,...}` 就直接把地址告诉用户，不要重复启动。
2. 没在运行就在后台启动（`<skill目录>` 换成本 SKILL.md 所在目录的绝对路径）：
   ```bash
   node "<skill目录>/scripts/server.js"
   ```
   - 用后台方式运行（不要阻塞当前对话），然后再 ping 一次确认启动成功。
   - 端口被占用时改用 `PORT=3001`（Windows PowerShell：`$env:PORT=3001`）。
   - 想换小说保存位置时设置 `NOVEL_DATA_DIR`，默认是 `~/novel-writer-data`。
3. 告诉用户打开 http://localhost:3000 （端口按实际）。如果能控制浏览器，可以帮用户打开。
4. 没有 Node.js 时告诉用户先安装 Node.js 18+（https://nodejs.org ），不要改用别的服务器：小说保存和 AI 转发都依赖这个服务器。

## AI 提供商

- 网页默认用 Claude。本地运行时由服务器调用 Anthropic API：优先使用启动服务器时的环境变量 `ANTHROPIC_API_KEY`，没有的话用户可以在网页「⚙️ 设置」里填写 Key，并选择 Opus 5.5 / Sonnet 5.5 / Haiku 5.5。
- 也可以在设置里切换到 Gemini、DeepSeek、MiniMax、智谱 GLM，填各自的 API Key。这些请求都经本地服务器转发，没有浏览器跨域问题。
- MiniMax Token Plan 订阅 Key（`sk-cp-` 开头）走 Anthropic 兼容接口 `https://api.minimaxi.com/anthropic`，设置里「接口类型」选「自动」或「Token Plan」即可。
- 智谱 GLM Coding Plan 套餐走专属接口 `https://open.bigmodel.cn/api/coding/paas/v4`，设置里「接口类型」选「Coding Plan」（默认）。
- 不要把用户的 API Key 写进任何文件或对话记录。

## 小说保存在哪里

```
<NOVEL_DATA_DIR>/novels/<小说id>/meta.json         书名、设定、世界观、角色、大纲、创作进度
<NOVEL_DATA_DIR>/novels/<小说id>/chapters/<n>.json  章节数据（含最近 5 个历史版本、画布位置）
<NOVEL_DATA_DIR>/novels/<小说id>/chapters/第<n>章.md 章节正文
<NOVEL_DATA_DIR>/trash/                            网页里删除的小说会移到这里
```

## 帮用户直接修改章节

用户让你改某一章（比如「把第3章的东京改成北京」）时：

1. 用 `meta.json` 里的 `title` 找到对应小说的文件夹。
2. 直接编辑 `chapters/第<n>章.md`。只改正文文件，不要改 `.json`。
3. 网页下次读取这部小说时会自动采用 `.md` 里的新内容，并把旧版本存进历史版本。告诉用户：在网页里回到书架重新打开这部小说即可看到修改。
4. 如果后面的章节也需要跟着改，建议用户在网页「📜 原稿」里打开这一章，点「改写后续」，让 AI 基于修改后的内容重写后续章节。也可以由你直接改后续章节的 `.md`。

不要在网页正在自动创作时修改同一部小说的文件，先让用户点「暂停」。

## 停止服务器

结束运行 `scripts/server.js` 的那个后台进程即可。小说都在数据文件夹里，不会丢失。
