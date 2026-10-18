# Notera · 音程练习室

面向吉他初学者的中文音程学习应用，通过可视化、聆听与练习建立判断直觉。

技术栈：**React 19 + TypeScript + Vite**，使用 **pnpm** 管理依赖、**Vitest + Testing Library** 验证算法和交互。

## 本地运行

需要 Node.js 22.12+（当前已在 Node.js 24 上验证）和 pnpm 10。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://127.0.0.1:5173 。停止运行按 Ctrl+C。Vite 支持开发热更新。

服务器默认监听所有网络接口。同一局域网的其他设备可打开 `http://这台电脑的局域网IP:5173`，使用启动输出中的 Network 地址；其他设备上的 `127.0.0.1` 或 `localhost` 指向设备自身。电脑需保持服务运行，设备需处于可互通的同一网络；如果仍无法连接，请检查系统防火墙是否允许 Node.js 接受传入连接，以及路由器是否开启访客网络或设备隔离。生产构建预览使用相同方式访问，端口为 `4173`。

项目锁定 `packageManager: pnpm@10.23.0`，提交 `pnpm-lock.yaml`，请使用 pnpm 安装依赖。

## 安卓安装与离线使用（PWA）

1. 执行 `pnpm build`，将 `dist/` 内的全部文件部署到支持 **HTTPS** 的静态网站；保留 `sw.js`、manifest 和 icons，建议 `sw.js` 使用 `Cache-Control: no-cache`。
2. 安卓手机用 Chrome 打开 HTTPS 网站，等待首次页面加载完成，在浏览器菜单中选择「添加到主屏幕」→「安装」（名称可能因浏览器版本而异）。
3. 首次打开时保持联网，等待离线资源缓存完成；然后开启飞行模式，从桌面图标重新打开，确认可以练习和播放声音。以后使用无需电脑在线。

离线缓存仅在生产构建启用，`pnpm dev` 不启用。`pnpm preview` 可用于电脑 localhost 上的验证；手机访问 `http://电脑IP:4173` 不具备安装和离线缓存所需的安全环境，必须改用 HTTPS。不要直接用文件管理器打开 `dist/index.html`。

更新网站后，联网打开应用以下载新版缓存，再关闭该网站的所有标签页和应用窗口，重新打开即可使用新版；不会在练习过程中强制刷新。练习记录仍保存在当前网站的本地存储，换域名、清除网站数据或卸载时可能丢失；原局域网地址的记录不会自动转移到新域名。

没有 HTTPS 网站时，也可用安卓 USB 调试进行本地安装验证：电脑安装 Android Platform Tools，连接手机并授权 USB 调试，运行 `pnpm preview`，再在另一个终端运行 `adb reverse tcp:4173 tcp:4173`。手机 Chrome 打开 `http://localhost:4173` 并安装；确认缓存后即可断开 USB。这个地址适合自用验证，后续更新仍需重新连接电脑。

安装环境依据：[MDN：Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)。

## 功能

应用打开后直接进入反应练习。

- **反应练习**：每轮 10 道不重复的题，支持自然音基础、升降音进阶。先选度数，再选性质，得到即时的两步推理反馈；支持提示、用时和正确率统计。
- **题目显示**：音名、简谱、唱名、钢琴键盘四种形式随时切换，保留当前题目和已选答案，并记住显示偏好。
- **声音**：通过 Web Audio 合成音色，聆听题目中的两个音。第一次播放需要用户点击。
- **错题复习**：每轮最多复习 10 道已保存的错题；独立答对后移出错题，使用提示答对则保留。
- **本地记录**：使用浏览器 localStorage，保留累计统计、最近练习和错题，支持重置及恢复上次记录。沿用 `notera-progress-v1`、`notera-progress-backup` 存储键，现有记录无需迁移。

刷新页面会开启新一轮练习，累计统计和错题仍然保留。将浏览器标签隐藏时，作答计时暂停。

简谱与唱名统一使用 **1=C、固定 Do**：C 对应 1 / Do，C4 为不带点的中音，低、高八度分别在下方、上方加点。题目保留原始音名拼写，例如 F♯ 为 ♯4 / ♯Fa，G♭ 为 ♭5 / ♭Sol；琴键显示也提示升降音的拼写，以便判断音程度数。

安装依赖后无需联网即可使用。练习覆盖一至八度的纯、大、小、增、减音程。

## 常用命令

```sh
pnpm dev          # 开发服务器与热更新
pnpm typecheck    # TypeScript 严格类型检查
pnpm test         # 算法、练习状态、存储兼容与组件交互测试
pnpm test:watch   # 开发时持续运行测试
pnpm build        # 类型检查并构建到 dist/
pnpm preview      # 本机和局域网预览生产构建（4173 端口）
pnpm format       # 格式化代码与文档
```

## 快捷键

1–8 选择度数；Space 播放；Enter 提交或进入下一题。

## 代码结构

```text
src/
  App.tsx                  应用入口与题目显示偏好
  main.tsx                 React 入口
  styles.css               响应式界面
  pages/PracticePage.tsx    反应练习
  components/              题目显示、作答与反馈
  hooks/useAudio.ts        Web Audio 生命周期
  hooks/usePractice.ts     练习状态、记录保存与计时
  lib/notation.ts          四种表示形式、简谱与固定唱名
  lib/theory.ts            音名、半音、音程计算
  lib/practice.ts          题目队列与纯函数状态机
  lib/progress.ts          旧记录读取、校验与存储
  lib/types.ts             领域类型
tests/                     乐理、练习与 React 回归测试
```

UI 使用 JSX 和 React 状态更新，不通过 `innerHTML` 或全局 DOM 事件委托绘制页面。选择答案不会重新挂载按钮或练习区域。

乐理参考：[Music Theory for the 21st-Century Classroom](https://musictheory.pugetsound.edu/mt21c/AugmentedAndDiminishedIntervals.html)。
