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

## 功能

- **探索音程**：在标准调弦吉他 0–12 品指板、钢琴键盘和半音阶梯之间切换；点击选音，也可指定音名、升降号与八度。
- **理解判断**：同步显示字母音名的度数与实际半音数；支持等音换写对照，例如增四度与减五度。
- **声音**：通过 Web Audio 合成音色，支持依次播放和同时播放。第一次播放需要用户点击；音色用于音高关系学习，不是真实吉他采样。
- **反应练习**：每轮 10 道不重复的题，基础自然音、进阶升降音；先选度数，再选性质，得到即时的两步推理反馈。支持提示、用时和正确率统计。
- **错题复习**：每轮最多复习 10 道已保存的错题；独立答对后移出错题，使用提示答对则保留。
- **学习笔记**：度数与性质的推导、音程家族、八个基准和等音辨析。
- **本地记录**：使用浏览器 localStorage；沿用原版的 `notera-progress-v1`、`notera-progress-backup` 存储键，现有统计和易错题无需迁移。

切换页面会保留当前题目、已选答案和探索状态。刷新页面会开启新一轮练习，累计统计和错题仍然保留。切出练习页面或将浏览器标签隐藏时，作答计时暂停。

安装依赖后无需联网即可使用。练习覆盖一至八度的纯、大、小、增、减音程。探索区支持更宽音域、复音程和多重增减拼写；指板仅覆盖标准调弦前 12 品，超出范围的音可以在琴键和阶梯中查看。

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

练习中：1–8 选择度数；Space 播放；Enter 提交或进入下一题。原生选音控件使用浏览器标准键盘操作。

## 代码结构

```text
src/
  App.tsx                  页面导航与跨页状态
  main.tsx                 React 入口
  styles.css               响应式界面
  pages/                   探索、练习、学习笔记
  components/              指板、琴键、阶梯、选音、作答与反馈
  hooks/useAudio.ts        Web Audio 生命周期
  hooks/usePractice.ts     练习状态、记录保存与计时
  lib/theory.ts            音名、半音、音程计算
  lib/practice.ts          题目队列与纯函数状态机
  lib/progress.ts          旧记录读取、校验与存储
  lib/types.ts             领域类型
  lib/presets.ts           学习示例
tests/                     乐理、练习与 React 回归测试
```

UI 使用 JSX 和 React 状态更新，不通过 `innerHTML` 或全局 DOM 事件委托绘制页面。页面入场动画仅在切换页面时运行，选择答案不会重新挂载按钮或练习区域。

乐理参考：[Music Theory for the 21st-Century Classroom](https://musictheory.pugetsound.edu/mt21c/AugmentedAndDiminishedIntervals.html)。
