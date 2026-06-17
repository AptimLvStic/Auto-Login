import fs from "node:fs";
import xlsx from "xlsx";
import {
  IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELD_KEYS,
  buildInitialFieldMapping,
  getMissingMappings,
  normalizeUrlValue
} from "../shared/site.js";

function isValidUrl(value) {
  try {
    normalizeUrlValue(value);
    return true;
  } catch {
    return false;
  }
}

function getWorkbookRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(firstSheet, {
    defval: "",
    raw: false
  });

  return {
    sheetName: firstSheetName,
    rows
  };
}

export function validateFieldMapping(mapping) {
  const missingFields = getMissingMappings(mapping);

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

function getMappedValue(row, mapping, fieldKey) {
  const sourceHeader = mapping[fieldKey];
  if (!sourceHeader) {
    return "";
  }

  return String(row[sourceHeader] ?? "").trim();
}

export function normalizeImportedRow(row, rowNumber, mapping) {
  const rawSiteUrl = getMappedValue(row, mapping, "siteUrl");
  const rawLoginUrl = getMappedValue(row, mapping, "loginUrl");
  const fallbackUrl = rawSiteUrl || rawLoginUrl;

  const normalized = {
    rowNumber,
    siteName: getMappedValue(row, mapping, "siteName"),
    siteUrl: fallbackUrl ? normalizeUrlValue(rawSiteUrl || fallbackUrl) : "",
    username: getMappedValue(row, mapping, "username"),
    password: getMappedValue(row, mapping, "password"),
    loginUrl: fallbackUrl ? normalizeUrlValue(rawLoginUrl || fallbackUrl) : "",
    usernameSelector: getMappedValue(row, mapping, "usernameSelector"),
    passwordSelector: getMappedValue(row, mapping, "passwordSelector"),
    submitSelector: getMappedValue(row, mapping, "submitSelector"),
    groupName: getMappedValue(row, mapping, "groupName"),
    notes: getMappedValue(row, mapping, "notes")
  };

  const errors = [];
  if (!normalized.siteName) {
    errors.push("站点名称不能为空");
  }
  if (!normalized.siteUrl || !isValidUrl(normalized.siteUrl)) {
    errors.push("站点地址必须是有效 URL");
  }
  if (!normalized.loginUrl || !isValidUrl(normalized.loginUrl)) {
    errors.push("登录页地址必须是有效 URL");
  }
  if (!normalized.username) {
    errors.push("账号不能为空");
  }
  if (!normalized.password) {
    errors.push("密码不能为空");
  }
  if (!normalized.usernameSelector) {
    errors.push("账号输入框 Selector 不能为空");
  }
  if (!normalized.passwordSelector) {
    errors.push("密码输入框 Selector 不能为空");
  }
  if (!normalized.submitSelector) {
    errors.push("提交按钮 Selector 不能为空");
  }

  return {
    normalized,
    errors
  };
}

export function getExcelPreview(filePath) {
  const { rows, sheetName } = getWorkbookRows(filePath);
  const headers = Object.keys(rows[0] ?? {});
  const sampleRows = rows.slice(0, 5);

  return {
    sheetName,
    headers,
    sampleRows,
    totalRows: rows.length,
    suggestedMapping: buildInitialFieldMapping(headers),
    requiredFields: REQUIRED_IMPORT_FIELD_KEYS,
    fields: IMPORT_FIELDS
  };
}

export function parseExcelFile(filePath, mapping) {
  const mappingValidation = validateFieldMapping(mapping);
  if (!mappingValidation.valid) {
    return {
      validRows: [],
      errors: [
        {
          rowNumber: 0,
          message: `缺少必填映射：${mappingValidation.missingFields
            .map((field) => field.label)
            .join("、")}`
        }
      ]
    };
  }

  const { rows } = getWorkbookRows(filePath);
  const validRows = [];
  const errors = [];

  rows.forEach((row, index) => {
    const { normalized, errors: rowErrors } = normalizeImportedRow(
      row,
      index + 2,
      mapping
    );

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber: normalized.rowNumber,
        message: rowErrors.join("；")
      });
      return;
    }

    validRows.push(normalized);
  });

  return {
    validRows,
    errors
  };
}
