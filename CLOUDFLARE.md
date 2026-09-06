# Cloudflare 部署与运维

本文档不要求直接向 D1 执行 SQL。创建场次使用 `script/update-time.ts`，添加/修改队伍在 `/rank/` 网页中完成。

## 首次部署

```bash
pnpm install
pnpm exec wrangler login
```

如果还没有 Pages 项目：

```bash
pnpm exec wrangler pages project create ycup-archive --production-branch main
```

如果还没有 D1 数据库：

```bash
pnpm exec wrangler d1 create ycup --location apac
```

D1 创建命令会输出一个 `database_id`。请确认 `wrangler.jsonc` 和 `scheduler/wrangler.jsonc` 里都填同一个 UUID。当前仓库里如果已经有值，直接跳过这一项。

建表并设置管理员令牌：

```bash
pnpm exec wrangler d1 migrations apply ycup --remote
echo "换成一段只有裁判知道的长随机字符串" | pnpm exec wrangler pages secret put ADMIN_WRITE_TOKEN --project-name ycup-archive
```

构建并部署 Pages。Pages 同时承担 VitePress 静态站和 `functions/api/*`，不需要单独部署后端：

```bash
pnpm docs:build
pnpm exec wrangler pages deploy .vitepress/dist --project-name ycup-archive
```

再部署自动排期与 Rating Worker：

```bash
pnpm exec wrangler deploy --config scheduler/wrangler.jsonc
```

如果两个命令都成功，先验证 API：

```bash
curl https://ycup-archive.pages.dev/api/board
```

返回 `{"ok":true,...}` 即部署正常。

## 创建第一场并添加队伍

首次创建场次前不需要任何数据库操作。先创建第一场：

```bash
CLOUDFLARE_API_TOKEN=xxx \
CLOUDFLARE_ACCOUNT_ID=xxx \
CLOUDFLARE_D1_DATABASE_ID=xxx \
pnpm time:update -- --new --date 2026-09-10 --time 11:55 --title "Stage 1" --problems 10
```

这里需要三个环境变量：Cloudflare API Token、Account ID、D1 `database_id`。其中 `CLOUDFLARE_D1_DATABASE_ID` 就是上面确认过的 UUID，`CLOUDFLARE_ACCOUNT_ID` 可在 Cloudflare 控制台首页找到。

然后打开 `https://ycup-archive.pages.dev/rank/`，输入前面设置的 `ADMIN_WRITE_TOKEN`。队伍的新增、改名、成员增删、题目数和后续记分都可以在网页里完成。

## 调整下场比赛时间

如果自动排的下场时间不是实际时间，在网页外执行脚本更新：

```bash
CLOUDFLARE_API_TOKEN=xxx \
CLOUDFLARE_ACCOUNT_ID=xxx \
CLOUDFLARE_D1_DATABASE_ID=xxx \
pnpm time:update -- --date 2026-09-17 --time 11:55 --title "Stage 2" --problems 10
```

脚本默认更新最近一个未来场次；多场并存或需要修改历史场次时加 `--id 3`。脚本只需要 Cloudflare API Token，不需要比赛电脑登录 Cloudflare。

如果 Pages 项目名不是 `ycup-archive`，请把上面的 `--project-name` 和访问 URL 改成实际项目名。

## CI 自动部署

`.github/workflows/deploy.yml` 在 `main` 分支推送时执行：

```bash
pnpm exec wrangler d1 migrations apply ycup --remote
pnpm docs:build
pnpm exec wrangler pages deploy .vitepress/dist --project-name ycup-archive
pnpm exec wrangler deploy --config scheduler/wrangler.jsonc
```

CI 需要配置两个 secrets：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。Token 需要能读写 D1、Pages 和 Workers。Pages 的 `ADMIN_WRITE_TOKEN` 只通过 Pages secret 管理，不会写进 CI secret。

## 自动排期

`ycup-scheduler` Worker 每分钟运行一次。若某场比赛结束超过 15 分钟且还没有未来的场次记录，它会插入下一个周四 `11:55-12:35 UTC+8` 的默认场次。若已经手动创建或更新了未来场次，则不会重复插入。

同一 Worker 在比赛结束 15 分钟后写入最终个人 Perf，并重算/更新 `person_ratings`。比赛进行中不会触碰 Rating 表。

## 本地开发

```bash
node node_modules/vitepress/bin/vitepress.js build
node node_modules/wrangler/bin/wrangler.js pages dev .vitepress/dist --binding ADMIN_WRITE_TOKEN=local-test
```

首页访问 `/rank/`。管理员令牌只在浏览器 `localStorage` 中保存，服务端 API 仍会校验。
