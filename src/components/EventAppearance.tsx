import type { EventTheme, EventType } from "../types/domain";
import {
  DEFAULT_THEME,
  normalizeTheme,
  themePresets,
  themeStyle,
} from "../lib/eventTheme";
import { typeLabel } from "../lib/domain";

export function EventAppearance({
  value,
  type,
  onChange,
}: {
  value?: EventTheme;
  type?: EventType;
  onChange: (theme: EventTheme) => void;
}) {
  const theme = normalizeTheme(value);
  return (
    <fieldset id="editor-appearance">
      <legend>Giao diện</legend>
      <p className="field-hint">
        Màu riêng cho sự kiện này. Nền giấy và độ tương phản được điều chỉnh tự
        động; chỉ áp dụng sau khi lưu.
      </p>
      <div className="theme-editor">
        <div>
          <div
            className="theme-presets"
            role="group"
            aria-label="Bảng màu gợi ý"
          >
            {themePresets.map((preset) => (
              <button
                type="button"
                className="theme-preset secondary"
                key={preset.primary}
                aria-pressed={theme.primary === preset.primary}
                onClick={() =>
                  onChange({ version: 1, primary: preset.primary })
                }
              >
                <span
                  className="color-chip"
                  style={{ backgroundColor: preset.primary }}
                  aria-hidden="true"
                />
                {preset.name}
              </button>
            ))}
          </div>
          <label className="custom-color">
            Màu tùy chỉnh
            <input
              type="color"
              value={theme.primary}
              onChange={(e) =>
                onChange({ version: 1, primary: e.target.value })
              }
            />
            <span>{theme.primary.toUpperCase()}</span>
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => onChange({ ...DEFAULT_THEME })}
          >
            Khôi phục màu mặc định
          </button>
        </div>
        <div
          className="theme-preview"
          style={themeStyle(theme)}
          aria-label="Xem trước màu thiệp"
        >
          <div className="theme-preview-paper">
            <small>{typeLabel(type)}</small>
            <strong>
              {type === "congratulation"
                ? "Trân trọng chúc mừng"
                : "Trân trọng kính mời"}
            </strong>
            <span>Sự kiện của bạn</span>
            <i aria-hidden="true" />
            <span className="theme-preview-button">
              {type === "congratulation" ? "Mở thiệp chúc" : "Mở thiệp mời"}
            </span>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
