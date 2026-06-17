import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import electron from "electron";
import xlsx from "xlsx";
import { APP_CONFIG } from "./app/appConfig.js";
import { createDatabase } from "./database.js";
import { getExcelPreview, parseExcelFile } from "./excel.js";
import { createSecurityService } from "./security.js";
import { DEFAULT_SETTINGS, LOGIN_RESULT, normalizeUrlValue } from "../shared/site.js";

const execFileAsync = promisify(execFile);

const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell
} = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let database;
let security;

function getRendererUrl() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  return `file://${path.join(__dirname, "../../dist/index.html")}`;
}

function getTemplateRows() {
  return [
    {
      site_name: "CRM Portal",
      site_url: "https://crm.example.com",
      username: "alice@example.com",
      password: "secret123",
      login_url: "https://crm.example.com/login",
      username_selector: "#username",
      password_selector: "#password",
      submit_selector: "button[type='submit']",
      group_name: "业务系统",
      notes: "常规账号密码登录"
    },
    {
      site_name: "Finance Hub",
      site_url: "https://finance.example.com",
      username: "bob@example.com",
      password: "secret456",
      login_url: "https://finance.example.com/signin",
      username_selector: "input[name='user']",
      password_selector: "input[name='pass']",
      submit_selector: "#login-button",
      group_name: "财务系统",
      notes: "需要先进入登录页"
    }
  ];
}

function writeWorkbook(filePath, rows) {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, sheet, "Sites");
  xlsx.writeFile(workbook, filePath);
}

function normalizeSitePayload(payload) {
  const siteUrlInput = String(payload.siteUrl ?? "").trim();
  const loginUrlInput = String(payload.loginUrl ?? "").trim();
  const fallbackUrl = siteUrlInput || loginUrlInput;

  return {
    ...payload,
    siteName: String(payload.siteName ?? "").trim(),
    siteUrl: fallbackUrl ? normalizeUrlValue(siteUrlInput || fallbackUrl) : "",
    loginUrl: fallbackUrl ? normalizeUrlValue(loginUrlInput || fallbackUrl) : "",
    username: String(payload.username ?? "").trim(),
    password: String(payload.password ?? ""),
    usernameSelector: String(payload.usernameSelector ?? "").trim(),
    passwordSelector: String(payload.passwordSelector ?? "").trim(),
    submitSelector: String(payload.submitSelector ?? "").trim(),
    groupName: String(payload.groupName ?? "").trim(),
    notes: String(payload.notes ?? "").trim()
  };
}

function validateSitePayload(payload, existingRecord) {
  const requiredFields = [
    "siteName",
    "siteUrl",
    "loginUrl",
    "username",
    "usernameSelector",
    "passwordSelector",
    "submitSelector"
  ];

  const missingField = requiredFields.find((field) => !String(payload[field] ?? "").trim());
  if (missingField) {
    const fieldLabelMap = {
      siteName: "站点名称",
      siteUrl: "站点地址",
      loginUrl: "登录页地址",
      username: "账号",
      usernameSelector: "账号输入框 Selector",
      passwordSelector: "密码输入框 Selector",
      submitSelector: "提交按钮 Selector"
    };
    const error = new Error(`${fieldLabelMap[missingField] ?? missingField}不能为空`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!String(payload.password ?? "").trim() && !existingRecord?.password_encrypted) {
    const error = new Error("密码不能为空");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  try {
    normalizeUrlValue(payload.siteUrl);
    normalizeUrlValue(payload.loginUrl);
  } catch {
    const error = new Error("站点地址和登录页地址必须是有效的 URL");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

function validateGroupPayload(payload) {
  const name = String(payload.name ?? "").trim();
  if (!name) {
    const error = new Error("分组名称不能为空");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

function applyWindowSettings(window, settings) {
  const zoomFactor = Math.max(0.8, Math.min(1.4, settings.zoomLevel / 100));
  window.webContents.setZoomFactor(zoomFactor);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    autoHideMenuBar: true,
    title: APP_CONFIG.name,
    backgroundColor: "#f2eadc",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: false
    }
  });

  applyWindowSettings(mainWindow, database?.getSettings?.() ?? DEFAULT_SETTINGS);
  mainWindow.loadURL(getRendererUrl());
}

async function importExcel(filePath, mapping) {
  const parsed = parseExcelFile(filePath, mapping);
  if (parsed.validRows.length > 0) {
    const records = parsed.validRows.map((row) => ({
      siteName: row.siteName,
      siteUrl: row.siteUrl,
      loginUrl: row.loginUrl,
      username: row.username,
      passwordEncrypted: security.encrypt(row.password),
      usernameSelector: row.usernameSelector,
      passwordSelector: row.passwordSelector,
      submitSelector: row.submitSelector,
      groupName: row.groupName,
      notes: row.notes
    }));
    database.upsertImportedSites(records);
  }

  return {
    importedCount: parsed.validRows.length,
    failedCount: parsed.errors.length,
    errors: parsed.errors
  };
}

async function openUrlsInDefaultBrowser(urls) {
  const normalizedUrls = urls.map((url) => normalizeUrlValue(url));
  if (normalizedUrls.length === 0) {
    return;
  }

  if (process.platform === "win32") {
    try {
      await execFileAsync("cmd", ["/c", "start", "", ...normalizedUrls], { windowsHide: true });
      return;
    } catch {
      // Fall through to shell.openExternal.
    }
  }

  for (const url of normalizedUrls) {
    await shell.openExternal(url);
  }
}

async function launchLogin(siteId) {
  try {
    const record = database.getSiteById(siteId);
    if (!record) {
      return {
        status: LOGIN_RESULT.VALIDATION_ERROR,
        message: "未找到对应站点。"
      };
    }

    validateSitePayload(
      {
        siteName: record.site_name,
        siteUrl: record.site_url,
        loginUrl: record.login_url,
        username: record.username,
        password: record.password_encrypted,
        usernameSelector: record.username_selector,
        passwordSelector: record.password_selector,
        submitSelector: record.submit_selector
      },
      record
    );

    await openUrlsInDefaultBrowser([record.login_url]);
    database.touchSiteLastUsed(siteId);

    return {
      status: LOGIN_RESULT.SUCCESS,
      message: "已使用系统默认浏览器打开登录页。"
    };
  } catch (error) {
    if (error?.code === "VALIDATION_ERROR") {
      return {
        status: LOGIN_RESULT.VALIDATION_ERROR,
        message: error.message
      };
    }

    return {
      status: LOGIN_RESULT.UNKNOWN_ERROR,
      message: error?.message || "打开浏览器失败。"
    };
  }
}

async function launchSites(siteIds) {
  const records = siteIds
    .map((siteId) => ({ siteId, record: database.getSiteById(siteId) }))
    .filter((item) => item.record);

  if (records.length === 0) {
    return [
      {
        siteId: "",
        status: LOGIN_RESULT.VALIDATION_ERROR,
        message: "未找到可打开的站点。"
      }
    ];
  }

  try {
    const urls = records.map(({ record }) => record.login_url);
    await openUrlsInDefaultBrowser(urls);
    records.forEach(({ siteId }) => database.touchSiteLastUsed(siteId));
    return records.map(({ siteId }) => ({
      siteId,
      status: LOGIN_RESULT.SUCCESS,
      message: "已使用系统默认浏览器打开登录页。"
    }));
  } catch (error) {
    return records.map(({ siteId }) => ({
      siteId,
      status: LOGIN_RESULT.UNKNOWN_ERROR,
      message: error?.message || "批量打开浏览器失败。"
    }));
  }
}

async function exportSitesToExcel() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "导出当前站点列表",
    defaultPath: "site-list-export.xlsx",
    filters: [
      {
        name: "Excel",
        extensions: ["xlsx"]
      }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const rows = database.listSites().map((site) => ({
    site_name: site.siteName,
    site_url: site.siteUrl,
    login_url: site.loginUrl,
    username: site.username,
    username_selector: site.usernameSelector,
    password_selector: site.passwordSelector,
    submit_selector: site.submitSelector,
    group_name: site.groupName ?? "",
    notes: site.notes ?? "",
    last_used_at: site.lastUsedAt ?? ""
  }));

  writeWorkbook(result.filePath, rows);
  return result.filePath;
}

async function downloadTemplateWorkbook() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "保存导入模板",
    defaultPath: "auto-login-template.xlsx",
    filters: [
      {
        name: "Excel",
        extensions: ["xlsx"]
      }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  writeWorkbook(result.filePath, getTemplateRows());
  return result.filePath;
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath("userData"), "auto-login.db");
  database = createDatabase(dbPath);
  security = createSecurityService({
    safeStorage,
    namespace: "auto-login",
    vaultStoragePath: path.join(app.getPath("userData"), "password-vault-hint.json")
  });

  ipcMain.handle("app:getMeta", () => ({
    appName: APP_CONFIG.name,
    appDescription: APP_CONFIG.description,
    dbPath: database.dbPath,
    encryptionMode: security.encryptionMode,
    appVersion: app.getVersion(),
    userDataPath: app.getPath("userData")
  }));

  ipcMain.handle("app:getSettings", () => database.getSettings());

  ipcMain.handle("app:saveSettings", (_event, settings) => {
    const normalized = {
      zoomLevel: Number(settings.zoomLevel ?? DEFAULT_SETTINGS.zoomLevel),
      fontScale: Number(settings.fontScale ?? DEFAULT_SETTINGS.fontScale),
      themeMode: settings.themeMode ?? DEFAULT_SETTINGS.themeMode
    };

    const saved = database.saveSettings(normalized);
    if (mainWindow && !mainWindow.isDestroyed()) {
      applyWindowSettings(mainWindow, saved);
    }
    return saved;
  });

  ipcMain.handle("app:getPasswordVaultMeta", () => ({
    mode: security.encryptionMode,
    managedBy: "local-system-keyring",
    note: "密码仅在当前设备环境下加密保存，用于本地受控访问。"
  }));

  ipcMain.handle("sites:list", () => database.listSites());
  ipcMain.handle("groups:list", () => database.listGroups());

  ipcMain.handle("groups:save", (_event, payload) => {
    const normalized = {
      id: String(payload.id ?? "").trim(),
      name: String(payload.name ?? "").trim(),
      notes: String(payload.notes ?? "").trim()
    };
    validateGroupPayload(normalized);
    return { id: database.saveGroup(normalized) };
  });

  ipcMain.handle("groups:delete", (_event, groupName) => {
    database.deleteGroup(groupName);
    return { success: true };
  });

  ipcMain.handle("groups:moveSites", (_event, siteIds, groupName) => {
    database.moveSitesToGroup(siteIds, groupName);
    return { success: true };
  });

  ipcMain.handle("sites:pickExcelFile", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Excel",
          extensions: ["xlsx", "xls"]
        }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("sites:downloadTemplate", async () => downloadTemplateWorkbook());
  ipcMain.handle("sites:exportExcel", async () => exportSitesToExcel());
  ipcMain.handle("sites:getExcelPreview", async (_event, filePath) => getExcelPreview(filePath));
  ipcMain.handle("sites:importExcel", async (_event, filePath, mapping) => importExcel(filePath, mapping));

  ipcMain.handle("sites:save", async (_event, payload) => {
    const existingRecord = payload.id ? database.getSiteById(payload.id) : null;
    const normalizedPayload = normalizeSitePayload(payload);
    validateSitePayload(normalizedPayload, existingRecord);

    const passwordEncrypted = String(normalizedPayload.password ?? "").trim()
      ? security.encrypt(normalizedPayload.password)
      : existingRecord.password_encrypted;

    security.passwordVault.persistHint(normalizedPayload.siteName ?? "site");

    const id = database.saveSite({
      ...normalizedPayload,
      passwordEncrypted
    });

    return { id };
  });

  ipcMain.handle("sites:delete", async (_event, siteId) => {
    database.deleteSite(siteId);
    return { success: true };
  });

  ipcMain.handle("sites:launchLogin", async (_event, siteId) => launchLogin(siteId));
  ipcMain.handle("sites:launchBatch", async (_event, siteIds) => launchSites(siteIds));

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  database?.close();
});
