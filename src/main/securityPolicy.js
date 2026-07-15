import { normalizeUrlValue } from "../shared/site.js";

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_THEME_MODES = new Set(["light", "dark"]);

export function normalizeExternalUrl(value) {
  const normalized = normalizeUrlValue(value);
  const url = new URL(normalized);

  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol)) {
    const error = new Error("仅支持打开 HTTP 或 HTTPS 登录页。");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return url.toString();
}

export function normalizeSiteIds(value, maximum = 50) {
  if (!Array.isArray(value)) {
    const error = new Error("站点列表格式无效。");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const ids = [...new Set(value.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > maximum) {
    const error = new Error(`请一次选择 1 至 ${maximum} 个站点。`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return ids;
}

export function normalizeSettings(value, defaults) {
  const zoomLevel = Math.round(Number(value?.zoomLevel ?? defaults.zoomLevel));
  const fontScale = Math.round(Number(value?.fontScale ?? defaults.fontScale));
  const themeMode = String(value?.themeMode ?? defaults.themeMode);

  return {
    zoomLevel: Number.isFinite(zoomLevel) ? Math.min(140, Math.max(80, zoomLevel)) : defaults.zoomLevel,
    fontScale: Number.isFinite(fontScale) ? Math.min(130, Math.max(85, fontScale)) : defaults.fontScale,
    themeMode: ALLOWED_THEME_MODES.has(themeMode) ? themeMode : defaults.themeMode
  };
}
