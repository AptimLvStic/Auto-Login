import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import xlsx from "xlsx";
import {
  getExcelPreview,
  normalizeImportedRow,
  parseExcelFile,
  validateFieldMapping
} from "../src/main/excel.js";

test("validateFieldMapping reports missing required fields", () => {
  const result = validateFieldMapping({
    siteName: "名称",
    siteUrl: "地址"
  });

  assert.equal(result.valid, false);
  assert.equal(result.missingFields.some((field) => field.key === "password"), true);
});

test("normalizeImportedRow uses custom mapping", () => {
  const result = normalizeImportedRow(
    {
      "系统名称": "Portal A",
      "入口地址": "https://example.com",
      "登录账户": "alice",
      "登录密码": "secret",
      "登录页面": "https://example.com/login",
      "账号框": "#user",
      "密码框": "#pass",
      "按钮": "#submit",
      "说明": "ok"
    },
    2,
    {
      siteName: "系统名称",
      siteUrl: "入口地址",
      username: "登录账户",
      password: "登录密码",
      loginUrl: "登录页面",
      usernameSelector: "账号框",
      passwordSelector: "密码框",
      submitSelector: "按钮",
      notes: "说明"
    }
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.normalized.siteName, "Portal A");
  assert.equal(result.normalized.notes, "ok");
});

test("normalizeImportedRow auto-fills protocol and missing login URL", () => {
  const result = normalizeImportedRow(
    {
      "系统名称": "Portal B",
      "入口地址": "portal.example.com",
      "登录账户": "alice",
      "登录密码": "secret",
      "登录页面": "",
      "账号框": "#user",
      "密码框": "#pass",
      "按钮": "#submit"
    },
    2,
    {
      siteName: "系统名称",
      siteUrl: "入口地址",
      username: "登录账户",
      password: "登录密码",
      loginUrl: "登录页面",
      usernameSelector: "账号框",
      passwordSelector: "密码框",
      submitSelector: "按钮"
    }
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.normalized.siteUrl, "https://portal.example.com/");
  assert.equal(result.normalized.loginUrl, "https://portal.example.com/");
});

test("getExcelPreview returns headers and suggested mapping", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "site-launcher-preview-"));
  const filePath = path.join(tempDir, "preview.xlsx");
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet([
    {
      site_name: "Portal A",
      site_url: "https://example.com",
      username: "alice",
      password: "secret",
      login_url: "https://example.com/login",
      username_selector: "#user",
      password_selector: "#pass",
      submit_selector: "#submit",
      notes: "primary"
    }
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, "Sites");
  xlsx.writeFile(workbook, filePath);

  const result = getExcelPreview(filePath);
  assert.equal(result.headers.includes("site_name"), true);
  assert.equal(result.suggestedMapping.siteName, "site_name");
  assert.equal(result.totalRows, 1);
});

test("parseExcelFile imports rows with custom mapping and returns row errors", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "site-launcher-"));
  const filePath = path.join(tempDir, "sites.xlsx");
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet([
    {
      "系统名称": "Portal A",
      "入口地址": "https://example.com",
      "登录账户": "alice",
      "登录密码": "secret",
      "登录页面": "https://example.com/login",
      "账号框": "#user",
      "密码框": "#pass",
      "按钮": "#submit",
      "说明": "primary"
    },
    {
      "系统名称": "Broken Portal",
      "入口地址": "not-a-url",
      "登录账户": "bob",
      "登录密码": "secret",
      "登录页面": "https://example.com/login",
      "账号框": "",
      "密码框": "#pass",
      "按钮": "#submit",
      "说明": ""
    }
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, "Sites");
  xlsx.writeFile(workbook, filePath);

  const result = parseExcelFile(filePath, {
    siteName: "系统名称",
    siteUrl: "入口地址",
    username: "登录账户",
    password: "登录密码",
    loginUrl: "登录页面",
    usernameSelector: "账号框",
    passwordSelector: "密码框",
    submitSelector: "按钮",
    notes: "说明"
  });

  assert.equal(result.validRows.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /账号输入框 Selector 不能为空/);
});
