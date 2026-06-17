export const IMPORT_FIELDS = [
  {
    key: "siteName",
    label: "站点名称",
    required: true,
    suggestedHeaders: ["site_name", "siteName", "name", "site"]
  },
  {
    key: "siteUrl",
    label: "站点地址",
    required: true,
    suggestedHeaders: ["site_url", "siteUrl", "url", "site_link"]
  },
  {
    key: "username",
    label: "账号",
    required: true,
    suggestedHeaders: ["username", "account", "user", "login_name"]
  },
  {
    key: "password",
    label: "密码",
    required: true,
    suggestedHeaders: ["password", "pwd", "pass"]
  },
  {
    key: "loginUrl",
    label: "登录页地址",
    required: true,
    suggestedHeaders: ["login_url", "loginUrl", "login", "login_page"]
  },
  {
    key: "usernameSelector",
    label: "账号输入框 Selector",
    required: true,
    suggestedHeaders: ["username_selector", "user_selector", "account_selector"]
  },
  {
    key: "passwordSelector",
    label: "密码输入框 Selector",
    required: true,
    suggestedHeaders: ["password_selector", "pwd_selector", "pass_selector"]
  },
  {
    key: "submitSelector",
    label: "提交按钮 Selector",
    required: true,
    suggestedHeaders: ["submit_selector", "button_selector", "login_button_selector"]
  },
  {
    key: "groupName",
    label: "分组",
    required: false,
    suggestedHeaders: ["group_name", "group", "category", "folder"]
  },
  {
    key: "notes",
    label: "备注",
    required: false,
    suggestedHeaders: ["notes", "note", "remark", "remarks"]
  }
];

export const REQUIRED_IMPORT_FIELD_KEYS = IMPORT_FIELDS.filter(
  (field) => field.required
).map((field) => field.key);

export const LOGIN_RESULT = {
  SUCCESS: "success",
  VALIDATION_ERROR: "validation_error",
  PAGE_LOAD_ERROR: "page_load_error",
  SELECTOR_NOT_FOUND: "selector_not_found",
  SUBMIT_TIMEOUT: "submit_timeout",
  UNKNOWN_ERROR: "unknown_error"
};

export const DEFAULT_SETTINGS = {
  zoomLevel: 100,
  fontScale: 100,
  themeMode: "light"
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function normalizeUrlValue(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^[a-zA-Z][\w+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol).toString();
}

function normalizeHeaderName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function buildInitialFieldMapping(headers) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeaderName(header)
  }));

  return IMPORT_FIELDS.reduce((mapping, field) => {
    const matchedHeader = normalizedHeaders.find((header) =>
      field.suggestedHeaders.some(
        (suggestedHeader) => normalizeHeaderName(suggestedHeader) === header.normalized
      )
    );

    mapping[field.key] = matchedHeader?.original ?? "";
    return mapping;
  }, {});
}

export function getMissingMappings(mapping) {
  return IMPORT_FIELDS.filter(
    (field) => field.required && !String(mapping?.[field.key] ?? "").trim()
  );
}

export function getSiteGroup(site) {
  const manualGroup = String(site.groupName ?? "").trim();
  if (manualGroup) {
    return manualGroup;
  }

  try {
    return new URL(site.siteUrl).hostname || "未分组";
  } catch {
    return "未分组";
  }
}

export function filterSites(sites, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return sites;
  }

  return sites.filter((site) => {
    const values = [
      site.siteName,
      site.siteUrl,
      site.loginUrl,
      site.username,
      site.groupName,
      site.notes
    ];

    return values.some((value) =>
      String(value ?? "").toLowerCase().includes(normalized)
    );
  });
}

export function sortSitesByRecent(sites) {
  return [...sites].sort((left, right) => {
    const leftValue = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
    const rightValue = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
    return rightValue - leftValue;
  });
}

export function groupSitesByHost(sites) {
  return sites.reduce((groups, site) => {
    const key = getSiteGroup(site);
    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(site);
    return groups;
  }, {});
}

export function getGroupFilterOptions(sites, groups = []) {
  const fromSites = sites.map((site) => getSiteGroup(site));

  return [...new Set([...groups, ...fromSites].map((item) => String(item ?? "").trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, "zh-CN")
  );
}

export function paginateItems(items, page, pageSize) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    items: items.slice(start, start + safePageSize)
  };
}
