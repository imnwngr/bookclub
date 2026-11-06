import { describe, expect, it } from "vitest";
import { youtubeVideoId } from "../src/lib/youtube";

describe("YouTube video URLs", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=4",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube.com/embed/dQw4w9WgXcQ",
  ])("extracts the video ID from %s", url => {
    expect(youtubeVideoId(url)).toBe("dQw4w9WgXcQ");
  });
  it.each([
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&v=abcdefghijk",
    "https://youtube.com/watch?v=short",
    "https://user@youtube.com/watch?v=dQw4w9WgXcQ",
  ])("rejects %s", url => expect(youtubeVideoId(url)).toBeNull());
});
