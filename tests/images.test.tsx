import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
const state = vi.hoisted(() => ({
  paths: [] as string[],
  referenced: false,
  uploadError: false,
  removeError: false,
  downloadError: false,
  remove: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  errorMessage: (e: Error) => e.message,
  db: () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "20000000-0000-4000-8000-000000000001" } },
        error: null,
      }),
    },
    rpc: async () => ({
      error: null,
      data: state.referenced ? [] : state.paths.map((path) => ({ path })),
    }),
    from: () => ({
      insert: async (row: { path: string }) => {
        state.paths.push(row.path);
        return { error: null };
      },
      delete: () => ({
        eq: async (_key: string, path: string) => {
          state.paths = state.paths.filter((p) => p !== path);
          return { error: null };
        },
      }),
    }),
    storage: {
      from: () => ({
        download: async () => ({
          data: state.downloadError
            ? null
            : new Blob(["png"], { type: "image/png" }),
          error: state.downloadError ? new Error("Download failed") : null,
        }),
        upload: async (path: string) => {
          state.upload(path);
          expect(state.paths).toContain(path);
          return {
            error: state.uploadError ? new Error("Upload failed") : null,
          };
        },
        remove: async (paths: string[]) => {
          state.remove(paths);
          return {
            error: state.removeError ? new Error("Remove failed") : null,
          };
        },
      }),
    },
  }),
}));
import {
  uploadVenueImage,
  discardVenueImage,
  validateVenueFile,
} from "../src/features/events/images";
import { ImageEditor } from "../src/components/ImageEditor";
import { VenueImage } from "../src/components/VenueImage";
beforeEach(() => {
  state.paths = [];
  state.referenced = false;
  state.uploadError = false;
  state.removeError = false;
  state.downloadError = false;
  state.upload.mockClear();
  state.remove.mockClear();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL() {
        return "blob:test";
      }
      static revokeObjectURL() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());
it("renders the private downloaded image in event information and handles failures without broken img", async () => {
  const { unmount } = render(<VenueImage path="registered.png" />);
  expect(
    await screen.findByAltText("Hình ảnh địa điểm buổi gặp mặt"),
  ).toHaveAttribute("src", "blob:test");
  unmount();
  state.downloadError = true;
  render(<VenueImage path="blocked.png" />);
  expect(
    await screen.findByText("Ảnh địa điểm hiện không tải được."),
  ).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("validates MIME and size before any upload", () => {
  expect(() =>
    validateVenueFile(new File(["x"], "x.svg", { type: "image/svg+xml" })),
  ).toThrow();
  expect(() =>
    validateVenueFile(
      new File([new Uint8Array(5242881)], "x.png", { type: "image/png" }),
    ),
  ).toThrow();
  expect(state.upload).not.toHaveBeenCalled();
});
it("registers before upload and never persists base64 in metadata", async () => {
  const path = await uploadVenueImage(
    new File(["png"], "x.png", { type: "image/png" }),
  );
  expect(path).toMatch(/\.png$/);
  expect(state.paths).toEqual([path]);
  expect(path).not.toContain("20000000-0000-4000-8000-000000000001");
  await discardVenueImage(path);
  expect(state.paths).toEqual([]);
  expect(state.remove).toHaveBeenCalledWith([path]);
});
it("cleans failed upload and preserves referenced objects on discard", async () => {
  state.uploadError = true;
  await expect(
    uploadVenueImage(new File(["png"], "x.png", { type: "image/png" })),
  ).rejects.toThrow("Upload failed");
  expect(state.paths).toEqual([]);
  state.paths = ["referenced"];
  state.referenced = true;
  await discardVenueImage("referenced");
  expect(state.paths).toEqual(["referenced"]);
});
it("retains a registered cleanup record when network prevents deletion", async () => {
  state.uploadError = true;
  state.removeError = true;
  await expect(
    uploadVenueImage(new File(["png"], "x.png", { type: "image/png" })),
  ).rejects.toThrow("ảnh tạm");
  expect(state.paths).toHaveLength(1);
});
function Harness() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <ImageEditor file={file} path={null} onChange={setFile} disabled={false} />
  );
}
it("supports file picker, replacement, removal and paste without premature upload", () => {
  render(<Harness />);
  const input = screen.getByLabelText("Chọn ảnh địa điểm");
  fireEvent.change(input, {
    target: { files: [new File(["png"], "one.png", { type: "image/png" })] },
  });
  expect(screen.getByAltText("Xem trước ảnh địa điểm")).toBeInTheDocument();
  fireEvent.change(input, {
    target: { files: [new File(["jpg"], "two.jpg", { type: "image/jpeg" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xóa ảnh", exact: true }));
  expect(
    screen.queryByAltText("Xem trước ảnh địa điểm"),
  ).not.toBeInTheDocument();
  fireEvent.paste(screen.getByRole("group", { name: "Ảnh địa điểm" }), {
    clipboardData: {
      files: [new File(["webp"], "paste.webp", { type: "image/webp" })],
    },
  });
  expect(screen.getByAltText("Xem trước ảnh địa điểm")).toBeInTheDocument();
  expect(state.upload).not.toHaveBeenCalled();
});
