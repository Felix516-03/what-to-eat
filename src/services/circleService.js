import { requireSupabase } from "../lib/supabase.js"

export const POST_PAGE_SIZE = 20
export const COMMENT_PAGE_SIZE = 30

function cleanText(value, maxLength, fieldName) {
  const text = String(value || "").trim()
  if (!text) throw new Error(`${fieldName}不能为空`)
  if (text.length > maxLength) throw new Error(`${fieldName}不能超过 ${maxLength} 字`)
  return text
}

function cleanShop(shop, prefix = "shop") {
  if (!shop) return {
    [`${prefix}_name`]: null,
    [`${prefix}_location`]: null,
    [`${prefix}_category`]: null
  }

  return {
    [`${prefix}_name`]: String(shop.name || "").trim() || null,
    [`${prefix}_location`]: String(shop.location || "").trim() || null,
    [`${prefix}_category`]: String(shop.category || "").trim() || null
  }
}

export async function ensureAnonymousIdentity() {
  const client = requireSupabase()
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData.session?.user) return sessionData.session.user

  const { data, error } = await client.auth.signInAnonymously()
  if (error) throw error
  if (!data.user) throw new Error("匿名身份创建失败")
  return data.user
}

export async function getProfile(userId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from("profiles")
    .select("id,nickname,avatar_url,created_at")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfile(userId, nickname) {
  const client = requireSupabase()
  const value = cleanText(nickname, 30, "昵称")
  const { data, error } = await client
    .from("profiles")
    .upsert({ id: userId, nickname: value }, { onConflict: "id" })
    .select("id,nickname,avatar_url,created_at")
    .single()
  if (error) throw error
  return data
}

export async function fetchPosts({ type = "all", page = 0 } = {}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc("circle_posts_feed", {
    p_post_type: type === "all" ? null : type,
    p_limit: POST_PAGE_SIZE,
    p_offset: page * POST_PAGE_SIZE
  })
  if (error) throw error
  return data || []
}

export async function fetchPost(postId) {
  const client = requireSupabase()
  const { data, error } = await client.rpc("circle_post_detail", { p_post_id: postId })
  if (error) throw error
  return data?.[0] || null
}

export async function createPost({ userId, content, postType, shop }) {
  if (!["ask", "recommend", "warning", "chat"].includes(postType)) {
    throw new Error("请选择有效的帖子类型")
  }

  const client = requireSupabase()
  const payload = {
    user_id: userId,
    content: cleanText(content, 500, "帖子正文"),
    post_type: postType,
    ...cleanShop(shop)
  }
  const { data, error } = await client.from("posts").insert(payload).select("id").single()
  if (error) throw error
  return data
}

export async function deletePost(postId) {
  const client = requireSupabase()
  const { error } = await client.from("posts").delete().eq("id", postId)
  if (error) throw error
}

export async function fetchComments({ postId, page = 0 }) {
  const client = requireSupabase()
  const from = page * COMMENT_PAGE_SIZE
  const { data, error } = await client
    .from("comments")
    .select("id,post_id,user_id,content,recommended_shop_name,recommended_shop_location,recommended_shop_category,created_at,profiles!comments_user_id_fkey(nickname,avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .range(from, from + COMMENT_PAGE_SIZE - 1)
  if (error) throw error
  return data || []
}

export async function createComment({ postId, userId, content, shop }) {
  const client = requireSupabase()
  const payload = {
    post_id: postId,
    user_id: userId,
    content: cleanText(content, 300, "评论"),
    ...cleanShop(shop, "recommended_shop")
  }
  const { data, error } = await client.from("comments").insert(payload).select("id").single()
  if (error) throw error
  return data
}

export async function deleteComment(commentId) {
  const client = requireSupabase()
  const { error } = await client.from("comments").delete().eq("id", commentId)
  if (error) throw error
}

export async function toggleLike(postId) {
  const client = requireSupabase()
  const { data, error } = await client.rpc("toggle_post_like", { p_post_id: postId })
  if (error) throw error
  return data?.[0] || data
}

export async function createReport({ userId, targetType, targetId, reason = "其他" }) {
  if (!["post", "comment"].includes(targetType)) throw new Error("无效的举报对象")
  const client = requireSupabase()
  const { error } = await client.from("reports").insert({
    reporter_id: userId,
    target_type: targetType,
    target_id: targetId,
    reason: cleanText(reason, 200, "举报原因")
  })
  if (error) throw error
}
