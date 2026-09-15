# What to eat

一款帮助你解决“今天吃什么”的移动端应用。项目基于 Vue 3 + Vite 开发，通过 Capacitor 打包为 Android App，并使用 Supabase 提供饭圈社区的云端数据与匿名登录。

当前版本：`v1.0.1`

![What to eat 像素风图标](./assets/app-icon-source.png)

## 功能

- 按饭、面、粉、炸鸡汉堡等分类随机抽取店铺
- 管理个人偏好、自定义店铺与抽卡历史
- 饭圈社区发布帖子、评论、点赞和举报
- 将社区推荐店铺加入自己的本地抽卡池
- 分类图标自动匹配，未知分类使用通用餐饮图标
- Android 圆形、方形及自适应像素风应用图标
- App 内置隐私说明页面

## 技术栈

- Vue 3
- Vite
- Capacitor Android
- Supabase Auth、PostgreSQL、Data API 与 RLS

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
copy .env.example .env
npm run dev
```

macOS / Linux 请将 `copy` 换成 `cp`。

## 配置 Supabase

1. 在 [Supabase](https://supabase.com/) 创建项目。
2. 打开 **Authentication → Sign In / Providers → Anonymous**，启用匿名登录。
3. 打开 **SQL Editor**，执行 [`supabase/schema.sql`](./supabase/schema.sql)。
4. 从 **Project Settings → API** 获取 Project URL 与 anon / publishable key。
5. 复制 `.env.example` 为 `.env`，填写自己的配置：

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

前端只能使用 anon / publishable key。不要把 `service_role` key、数据库密码或签名密钥放入源码。

## 数据安全

饭圈业务表全部启用 RLS：

- 用户只能修改或删除自己的内容。
- 作者身份由 `auth.uid()` 判断，客户端不能自行伪造。
- 点赞通过数据库原子函数切换，避免重复操作。
- 删除帖子后，其评论与点赞通过外键级联清理。

仓库不会提交 `.env`、Android 本机 SDK 路径、生成后的网页包、签名文件、APK/AAB 或构建缓存。`.env.example` 仅保留安全占位符。

完整隐私政策见 [`PRIVACY.md`](./PRIVACY.md)。

## 构建网页

```bash
npm run build
```

## 构建 Android APK

准备好 Android Studio 和 Android SDK 后执行：

```bash
npm install
npm run android:apk
```

调试 APK 输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

正式签名配置使用被 Git 忽略的 `android/key.properties` 和 `.signing` 目录。可以参考 `android/key.properties.example` 配置自己的证书。

```bash
npm run android:release
npm run android:bundle
```

输出位置：

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

每次构建前，`android:sync` 会重新生成被忽略的 Android 网页资源。正式签名证书和密码必须单独安全备份；丢失证书后将无法使用相同身份更新已经发布的应用。

## 数据结构

- `profiles`：用户公开昵称
- `posts`：帖子正文、类型和店铺快照
- `comments`：评论及可选推荐店铺
- `post_likes`：点赞关系
- `reports`：帖子或评论举报记录

数据库初始化脚本位于 [`supabase/schema.sql`](./supabase/schema.sql)。

## Release

可安装的 Android 版本会放在 [GitHub Releases](https://github.com/Felix516-03/what-to-eat/releases) 中。`v1.0.1` 是首个使用项目正式签名证书构建的版本。
