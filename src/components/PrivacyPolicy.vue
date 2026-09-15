<template>
  <article class="privacy-policy">
    <div class="privacy-meta">
      <span>生效日期：2026 年 9 月 15 日</span>
      <span>适用版本：v1.0.1 及以后版本</span>
    </div>

    <p>
      What to eat 会尽量少收集数据。抽卡偏好主要保存在你的设备上；只有饭圈社区所需的内容会保存到 Supabase 云服务。
    </p>

    <section>
      <h2>保存在设备上的数据</h2>
      <ul>
        <li>自定义店铺、店铺评分和冷宫列表</li>
        <li>抽卡历史以及饮食偏好</li>
      </ul>
      <p>这些数据不会由本应用主动上传。本应用已关闭 Android 云端自动备份；清除应用数据会删除本地记录，设备迁移行为以 Android 系统为准。</p>
    </section>

    <section>
      <h2>保存在云端的数据</h2>
      <ul>
        <li>Supabase 生成的匿名用户标识和你设置的公开昵称</li>
        <li>你主动发布的帖子、评论、点赞和举报</li>
        <li>内容中关联的店铺名称、分类、地点描述以及时间记录</li>
      </ul>
      <p>帖子、评论、昵称和关联店铺会展示给其他饭圈用户；举报内容不会作为社区公开内容展示。</p>
    </section>

    <section>
      <h2>我们不主动收集</h2>
      <p>当前版本不要求真实姓名、邮箱、手机号、通讯录、精确位置、照片或支付信息，也未接入广告和第三方行为分析 SDK。</p>
    </section>

    <section>
      <h2>保存与删除</h2>
      <p>你可以在应用内删除自己发布的帖子和评论。匿名身份在卸载或清除应用数据后可能无法找回，但此前发布的云端内容不会自动删除。</p>
    </section>

    <section>
      <h2>安全与第三方服务</h2>
      <p>云端功能使用 Supabase Auth、RLS 和 HTTPS。Supabase 可能为运行服务处理 IP、设备信息及安全日志。</p>
    </section>

    <section>
      <h2>使用提醒</h2>
      <p>请勿在昵称、帖子、评论或举报中填写自己或他人的敏感信息。未成年人应在监护人指导下使用。</p>
    </section>

    <footer>
      <p>我们不会出售用户个人数据。政策有实质变化时会更新生效日期。</p>
      <a href="https://github.com/Felix516-03/what-to-eat/issues" target="_blank" rel="noreferrer">
        联系项目维护者
      </a>
    </footer>
  </article>
</template>

<style scoped>
.privacy-policy {
  display: grid;
  gap: 15px;
  color: #4b4541;
  font-size: 13px;
  line-height: 1.75;
}

.privacy-meta,
.privacy-policy section,
.privacy-policy footer {
  padding: 17px;
  border: 1px solid #f0e3da;
  border-radius: 18px;
  background: rgba(255, 255, 255, .94);
}

.privacy-meta {
  display: flex;
  gap: 4px 14px;
  flex-wrap: wrap;
  color: #96796b;
  font-size: 11px;
}

.privacy-policy > p,
.privacy-policy section p,
.privacy-policy footer p { margin: 0; }
.privacy-policy h2 { margin: 0 0 8px; color: #2e2926; font-size: 16px; }
.privacy-policy ul { margin: 0 0 8px; padding-left: 19px; }
.privacy-policy li + li { margin-top: 4px; }
.privacy-policy a { display: inline-block; margin-top: 9px; color: #d85d38; font-weight: 700; }
</style>
