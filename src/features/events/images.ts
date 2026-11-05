import { db } from "../../lib/supabase";
export const IMAGE_LIMIT = 5 * 1024 * 1024;
export function validateVenueFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Chỉ hỗ trợ JPG, PNG hoặc WebP.");
  if (file.size > IMAGE_LIMIT) throw Error("Ảnh không được lớn hơn 5 MB.");
  if (!file.size) throw Error("File ảnh rỗng.");
}
export async function discardVenueImage(path: string) {
  const unused = await db().rpc("unused_venue_images");
  if (unused.error) throw unused.error;
  if (!unused.data.some((row: { path: string }) => row.path === path)) return;
  const removed = await db().storage.from("bookclub-venues").remove([path]);
  if (removed.error) throw removed.error;
  const { error } = await db()
    .from("venue_image_uploads")
    .delete()
    .eq("path", path);
  if (error) throw error;
}
export async function uploadVenueImage(file: File) {
  validateVenueFile(file);
  const auth = await db().auth.getUser();
  if (auth.error || !auth.data.user) throw Error("Vui lòng đăng nhập lại.");
  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `${crypto.randomUUID()}/${crypto.randomUUID()}.${ext}`;
  const registered = await db()
    .from("venue_image_uploads")
    .insert({ path, created_by: auth.data.user.id });
  if (registered.error) throw registered.error;
  try {
    const result = await db()
      .storage.from("bookclub-venues")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (result.error) throw result.error;
    return path;
  } catch (error) {
    try {
      await discardVenueImage(path);
    } catch {
      throw Error(
        "Upload lỗi; ảnh tạm được ghi trong danh sách ảnh chưa dùng. Dọn ảnh tạm trước khi thử lại.",
      );
    }
    throw error;
  }
}
