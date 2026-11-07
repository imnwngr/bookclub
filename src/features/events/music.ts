import { db } from "../../lib/supabase";
export const MUSIC_BUCKET = "bookclub-music";
export const MUSIC_LIMIT = 20 * 1024 * 1024;
export async function validateMusic(file: File) {
  if (
    !/\.mp3$/i.test(file.name) ||
    !["audio/mpeg", "audio/mp3", ""].includes(file.type)
  )
    throw Error("Chỉ hỗ trợ file MP3.");
  if (!file.size || file.size > MUSIC_LIMIT)
    throw Error("MP3 phải có dung lượng từ 1 byte đến 20 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let offset = 0;
  if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) {
    if (bytes.length < 10 || [6, 7, 8, 9].some((i) => bytes[i] > 127))
      throw Error("MP3 có ID3 không hợp lệ.");
    offset =
      10 + (bytes[6] << 21) + (bytes[7] << 14) + (bytes[8] << 7) + bytes[9];
  }
  const frame = bytes
    .slice(offset, offset + 4096)
    .some(
      (b, i, a) =>
        b === 255 &&
        (a[i + 1] & 224) === 224 &&
        (a[i + 1] & 24) !== 8 &&
        (a[i + 1] & 6) !== 0 &&
        a[i + 2] >> 4 > 0 &&
        a[i + 2] >> 4 < 15 &&
        (a[i + 2] & 12) !== 12,
    );
  if (!frame) throw Error("Nội dung file không phải MP3 hợp lệ.");
}
export async function uploadMusic(file: File) {
  await validateMusic(file);
  const auth = await db().auth.getUser();
  if (auth.error || !auth.data.user) throw Error("Vui lòng đăng nhập lại.");
  const path =
    auth.data.user.id +
    "/" +
    crypto.randomUUID() +
    "/" +
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.mp3$/i, ".mp3");
  const registered = await db()
    .from("music_uploads")
    .insert({ path, created_by: auth.data.user.id });
  if (registered.error) throw registered.error;
  const result = await db()
    .storage.from(MUSIC_BUCKET)
    .upload(path, file, { contentType: "audio/mpeg", upsert: false });
  if (result.error) {
    try {
      await discardMusic(path);
    } catch {
      throw Error("Upload lỗi; file tạm còn trong danh sách dọn nhạc.");
    }
    throw result.error;
  }
  return path;
}
export async function discardMusic(path: string) {
  const unused = await db().rpc("unused_music");
  if (unused.error) throw unused.error;
  if (!unused.data.some((r: { path: string }) => r.path === path)) return;
  const removed = await db().storage.from(MUSIC_BUCKET).remove([path]);
  if (removed.error) throw removed.error;
  const result = await db().from("music_uploads").delete().eq("path", path);
  if (result.error) throw result.error;
}
export async function musicUrl(path: string) {
  const result = await db()
    .storage.from(MUSIC_BUCKET)
    .createSignedUrl(path, 3600);
  if (result.error) throw result.error;
  return result.data.signedUrl;
}
