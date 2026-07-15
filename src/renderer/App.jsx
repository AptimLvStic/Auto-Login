import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  IMPORT_FIELDS,
  PAGE_SIZE_OPTIONS,
  buildInitialFieldMapping,
  filterSites,
  getGroupFilterOptions,
  getSiteGroup,
  normalizeUrlValue,
  paginateItems,
  sortSitesByRecent
} from "../shared/site.js";

const emptyForm = {
  id: "",
  siteName: "",
  siteUrl: "",
  loginUrl: "",
  username: "",
  password: "",
  usernameSelector: "",
  passwordSelector: "",
  submitSelector: "",
  groupName: "",
  notes: ""
};

const emptyGroupForm = {
  id: "",
  name: "",
  notes: ""
};

function formatRelativeTime(value) {
  if (!value) {
    return "从未使用";
  }

  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff) || diff < 0) {
    return "从未使用";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }

  return `${Math.floor(diff / day)} 天前`;
}

function maskUsername(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length <= 2) {
    return "••••";
  }

  return `${text.slice(0, 2)}***`;
}

function buildGroupCounts(sites, groupNames) {
  const counts = new Map();
  groupNames.forEach((name) => counts.set(name, 0));

  sites.forEach((site) => {
    const groupName = getSiteGroup(site);
    counts.set(groupName, (counts.get(groupName) ?? 0) + 1);
  });

  return counts;
}

function Sidebar({
  activeView,
  setActiveView,
  appMeta,
  groupItems,
  groupFilter,
  onSelectGroup,
  onOpenSettings
}) {
  return (
    <aside className="sidebar">
      <div className="brand-card brand-card-compact">
        <div className="brand-card-head">
          <h1>{appMeta?.appName ?? "Auto Login"}</h1>
          <button type="button" className="ghost-icon-button" title="界面设置" onClick={onOpenSettings}>
            ⚙
          </button>
        </div>
        <p>{appMeta?.appDescription ?? "统一管理站点入口、账号凭据与分组策略的安全登录工作台。"}</p>
      </div>

      <section className="sidebar-section soft-card">
        <div className="sidebar-section-header">
          <div>
            <p className="eyebrow">GROUP TREE</p>
            <h3>站点列表</h3>
          </div>
        </div>

        <div className="group-tree">
          {groupItems.map((group) => {
            const isRoot = group.name === "__all__";
            const isActive = (groupFilter || "__all__") === group.name;

            return (
              <button
                key={group.name}
                type="button"
                className={[
                  "group-tree-button",
                  isRoot ? "group-tree-root" : "group-tree-child",
                  isActive ? "active" : ""
                ].join(" ").trim()}
                onClick={() => {
                  setActiveView("list");
                  onSelectGroup(group.name);
                }}
              >
                <span className="group-tree-label">
                  <span className="group-tree-icon">{group.icon}</span>
                  <span>{group.label}</span>
                </span>
                <span className="group-tree-count">{group.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <nav className="nav-list nav-list-spacious">
        <button
          type="button"
          className={activeView === "groups" ? "nav-item active" : "nav-item"}
          onClick={() => setActiveView("groups")}
        >
          分组管理
        </button>
      </nav>
    </aside>
  );
}

function SiteEditorDrawer({
  open,
  form,
  setForm,
  onSave,
  onClose,
  saving,
  groups,
  validationMessage
}) {
  if (!open) {
    return null;
  }

  const fieldList = [
    ["siteName", "站点名称"],
    ["siteUrl", "站点地址"],
    ["loginUrl", "登录页地址"],
    ["username", "账号"],
    ["password", form.id ? "新密码（留空则保留原密码）" : "密码"],
    ["usernameSelector", "账号输入框 Selector"],
    ["passwordSelector", "密码输入框 Selector"],
    ["submitSelector", "提交按钮 Selector"]
  ];

  return (
    <div
      className="drawer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="drawer-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header compact-header">
          <div>
            <p className="eyebrow">SITE EDITOR</p>
            <h2>{form.id ? "编辑站点" : "新增站点"}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            关闭
          </button>
        </div>

        {validationMessage ? <p className="error-text drawer-tip">{validationMessage}</p> : null}

        <form
          className="site-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="field-grid">
            {fieldList.map(([key, label]) => (
              <label key={key} className="field">
                <span>{label}</span>
                <input
                  type={key === "password" ? "password" : "text"}
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value
                    }))
                  }
                  placeholder={label}
                />
              </label>
            ))}

            <label className="field">
              <span>站点分组</span>
              <select
                value={form.groupName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    groupName: event.target.value
                  }))
                }
              >
                <option value="">未分组</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field full-span">
              <span>备注</span>
              <textarea
                rows="4"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
                placeholder="可记录站点说明、登录注意事项或特殊流程。"
              />
            </label>
          </div>

          <div className="action-row">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "保存中..." : "保存站点"}
            </button>
            <button type="button" className="ghost-button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function GroupEditorModal({
  open,
  groupForm,
  setGroupForm,
  onSave,
  onClose,
  saving,
  validationMessage
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header compact-header">
          <div>
            <p className="eyebrow">GROUP EDITOR</p>
            <h2>{groupForm.id ? "编辑分组" : "新增分组"}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            关闭
          </button>
        </div>

        {validationMessage ? <p className="error-text drawer-tip">{validationMessage}</p> : null}

        <div className="field-grid single-column">
          <label className="field">
            <span>分组名称</span>
            <input
              type="text"
              value={groupForm.name}
              onChange={(event) =>
                setGroupForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="例如：财务系统"
            />
          </label>

          <label className="field">
            <span>分组备注</span>
            <textarea
              rows="5"
              value={groupForm.notes}
              onChange={(event) =>
                setGroupForm((current) => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              placeholder="可选，记录该分组的用途或说明。"
            />
          </label>
        </div>

        <div className="action-row">
          <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
            {saving ? "保存中..." : groupForm.id ? "更新分组" : "创建分组"}
          </button>
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
        </div>
      </section>
    </div>
  );
}

function SiteActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="menu-shell">
      <button
        type="button"
        className={open ? "ghost-button compact-button menu-trigger active" : "ghost-button compact-button menu-trigger"}
        onClick={() => setOpen((current) => !current)}
        aria-label="更多操作"
      >
        ⋯
      </button>

      {open ? (
        <div className="menu-panel">
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            编辑
          </button>
          <button
            type="button"
            className="menu-item danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            删除
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ImportPanel({ onImported }) {
  const [selectedFile, setSelectedFile] = useState("");
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState(() => buildInitialFieldMapping([]));
  const [importResult, setImportResult] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  async function handlePickFile() {
    const filePath = await window.siteLauncherApi.pickExcelFile();
    if (!filePath) {
      return;
    }

    setSelectedFile(filePath);
    setImportResult(null);
    setLoadingPreview(true);

    try {
      const nextPreview = await window.siteLauncherApi.getExcelPreview(filePath);
      setPreview(nextPreview);
      setMapping(nextPreview.suggestedMapping ?? buildInitialFieldMapping(nextPreview.headers));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      await window.siteLauncherApi.downloadTemplate();
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      return;
    }

    setLoadingImport(true);
    try {
      const result = await window.siteLauncherApi.importExcel(selectedFile, mapping);
      setImportResult(result);
      onImported();
    } finally {
      setLoadingImport(false);
    }
  }

  return (
    <section className="panel section-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">EXCEL IMPORT</p>
          <h2>导入账号表</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
        >
          {downloadingTemplate ? "生成中..." : "下载模板示例"}
        </button>
      </div>

      <div className="import-card soft-card">
        <button type="button" className="primary-button" onClick={handlePickFile}>
          选择 Excel 文件
        </button>
        <p className="muted">{selectedFile || "尚未选择文件"}</p>
        {preview ? <p className="muted">工作表：{preview.sheetName}，共 {preview.totalRows} 行数据。</p> : null}
      </div>

      {loadingPreview ? <p className="muted">正在读取表头和样例数据...</p> : null}

      {preview ? (
        <>
          <div className="mapping-section soft-card">
            <div className="section-title">
              <h3>字段映射</h3>
              <p className="muted">每个系统字段都可以手动选择对应的 Excel 列。</p>
            </div>
            <div className="mapping-grid">
              {IMPORT_FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [field.key]: event.target.value
                      }))
                    }
                  >
                    <option value="">{field.required ? "请选择对应列" : "不导入该字段"}</option>
                    {preview.headers.map((header) => (
                      <option key={`${field.key}-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="mapping-section soft-card">
            <div className="section-title">
              <h3>样例预览</h3>
              <p className="muted">仅用于确认映射关系，不会修改原始 Excel。</p>
            </div>
            <div className="preview-table-shell">
              <table className="preview-table">
                <thead>
                  <tr>
                    {preview.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((row, index) => (
                    <tr key={`row-${index}`}>
                      {preview.headers.map((header) => (
                        <td key={`${index}-${header}`}>{String(row[header] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={handleImport} disabled={loadingImport}>
              {loadingImport ? "导入中..." : "按当前映射导入"}
            </button>
          </div>
        </>
      ) : null}

      {importResult ? (
        <div className="result-card soft-card">
          <h3>导入结果</h3>
          <p>
            成功 {importResult.importedCount} 条，失败 {importResult.failedCount} 条。
          </p>
          {importResult.errors.length > 0 ? (
            <ul className="error-list">
              {importResult.errors.map((error) => (
                <li key={`${error.rowNumber}-${error.message}`}>
                  {error.rowNumber > 0 ? `第 ${error.rowNumber} 行：` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="success-text">本次导入没有发现错误。</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SiteList({
  sites,
  groups,
  search,
  setSearch,
  groupFilter,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  onLaunch,
  onEdit,
  onDelete,
  onCreate,
  onExport,
  onLaunchBatch,
  onMoveSites,
  launchResult,
  onOpenImport
}) {
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [visibleAccounts, setVisibleAccounts] = useState({});
  const [viewMode, setViewMode] = useState("table");
  const [batchGroupValue, setBatchGroupValue] = useState("__keep__");

  const groupOptions = useMemo(() => {
    const names = new Set(getGroupFilterOptions(sites, groups.map((group) => group.name)));
    names.add("未分组");
    return ["__all__", ...Array.from(names).sort((left, right) => left.localeCompare(right, "zh-CN"))];
  }, [sites, groups]);

  const filteredBySearch = useMemo(() => filterSites(sites, search), [sites, search]);
  const filteredSites = useMemo(() => {
    if (!groupFilter) {
      return filteredBySearch;
    }

    return filteredBySearch.filter((site) => getSiteGroup(site) === groupFilter);
  }, [filteredBySearch, groupFilter]);

  const sortedSites = useMemo(() => sortSitesByRecent(filteredSites), [filteredSites]);
  const pagination = useMemo(
    () => paginateItems(sortedSites, currentPage, pageSize),
    [sortedSites, currentPage, pageSize]
  );

  const currentGroupLabel = groupFilter || "全部分组";
  const selectedCount = selectedSiteIds.length;
  const canOpenCurrentGroup = filteredSites.length > 0;

  useEffect(() => {
    setSelectedSiteIds((current) => current.filter((id) => sortedSites.some((site) => site.id === id)));
  }, [sortedSites]);

  useEffect(() => {
    if (currentPage !== pagination.page) {
      setCurrentPage(pagination.page);
    }
  }, [currentPage, pagination.page, setCurrentPage]);

  async function handleBatchMove() {
    if (selectedSiteIds.length === 0 || batchGroupValue === "__keep__") {
      return;
    }

    await onMoveSites(selectedSiteIds, batchGroupValue === "__ungrouped__" ? "" : batchGroupValue);
    setSelectedSiteIds([]);
    setBatchGroupValue("__keep__");
  }

  function toggleSiteSelection(siteId) {
    setSelectedSiteIds((current) =>
      current.includes(siteId) ? current.filter((id) => id !== siteId) : [...current, siteId]
    );
  }

  function toggleSelectCurrentPage() {
    const currentIds = pagination.items.map((site) => site.id);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedSiteIds.includes(id));

    setSelectedSiteIds((current) => {
      if (allSelected) {
        return current.filter((id) => !currentIds.includes(id));
      }

      return [...new Set([...current, ...currentIds])];
    });
  }

  function toggleAccountVisibility(siteId) {
    setVisibleAccounts((current) => ({
      ...current,
      [siteId]: !current[siteId]
    }));
  }

  return (
    <section className="panel section-panel list-panel">
      <div className="top-bar">
        <div className="top-bar-brand">
          <span className="logo-chip">A</span>
          <div>
            <p className="eyebrow">DIRECTORY</p>
            <h2>站点管理</h2>
          </div>
        </div>

        <div className="top-bar-actions">
          <button type="button" className="secondary-button" onClick={onOpenImport}>
            导入 Excel
          </button>
          <button type="button" className="ghost-button plus-button" onClick={onCreate} aria-label="新增站点">
            +
          </button>
        </div>
      </div>

      <div className="control-bar soft-card">
        <input
          className="search-input control-search"
          type="search"
          placeholder="搜索站点、域名、分组、账号或备注"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
        />

        <div className="view-switch">
          <button
            type="button"
            className={viewMode === "table" ? "view-switch-button active" : "view-switch-button"}
            onClick={() => setViewMode("table")}
          >
            表格
          </button>
          <button
            type="button"
            className={viewMode === "card" ? "view-switch-button active" : "view-switch-button"}
            onClick={() => setViewMode("card")}
          >
            卡片
          </button>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!canOpenCurrentGroup}
          onClick={() => onLaunchBatch(filteredSites.map((site) => site.id), currentGroupLabel)}
        >
          打开当前分组全部站点
        </button>

        <button type="button" className="secondary-outline-button" onClick={onExport}>
          导出列表
        </button>
      </div>

      <div className="stats-row">
        <strong>{currentGroupLabel}</strong>
        <span>共 {pagination.totalItems} 个站点</span>
      </div>

      {launchResult ? (
        <div className={`status-banner status-${launchResult.status}`}>
          <strong>{launchResult.status === "success" ? "success" : "notice"}</strong>
          <span>{launchResult.message}</span>
        </div>
      ) : null}

      <div className="list-scroll-region">
        {pagination.items.length === 0 ? (
          <div className="empty-state">当前没有符合条件的站点，请调整筛选条件或新增站点。</div>
        ) : viewMode === "card" ? (
          <div className="site-card-grid">
            {pagination.items.map((site) => (
              <article key={site.id} className="site-overview-card">
                <div className="site-overview-head">
                  <div className="site-overview-title">
                    <strong>{site.siteName}</strong>
                    <p>{site.siteUrl}</p>
                  </div>
                  <SiteActionMenu onEdit={() => onEdit(site)} onDelete={() => onDelete(site.id)} />
                </div>

                <div className="site-overview-meta">
                  <span title={site.username}>账号：{visibleAccounts[site.id] ? site.username : maskUsername(site.username)}</span>
                  <button type="button" className="link-button" onClick={() => toggleAccountVisibility(site.id)}>
                    👁
                  </button>
                </div>

                <div className="site-overview-meta compact-meta">
                  <span className="tag">{getSiteGroup(site)}</span>
                  <span className="mini-meta">最近：{formatRelativeTime(site.lastUsedAt)}</span>
                </div>

                <div className="site-overview-actions stacked-actions">
                  <button type="button" className="primary-button wide-button" onClick={() => onLaunch(site.id)}>
                    🔑 一键登录
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-shell">
            <div className="site-table table-header">
              <label className="table-checkbox-cell">
                <input
                  type="checkbox"
                  checked={pagination.items.length > 0 && pagination.items.every((site) => selectedSiteIds.includes(site.id))}
                  onChange={toggleSelectCurrentPage}
                />
              </label>
              <span>站点名称</span>
              <span>一键登录</span>
              <span>账号</span>
              <span>分组</span>
              <span>最近使用</span>
              <span>操作</span>
            </div>

            {pagination.items.map((site) => (
              <div key={site.id} className="site-table table-row" title={site.notes || ""}>
                <label className="table-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedSiteIds.includes(site.id)}
                    onChange={() => toggleSiteSelection(site.id)}
                  />
                </label>

                <div className="site-name-cell">
                  <strong>{site.siteName}</strong>
                  <span>{site.siteUrl}</span>
                </div>

                <div>
                  <button type="button" className="primary-button compact-button login-button" onClick={() => onLaunch(site.id)}>
                    登录
                  </button>
                </div>

                <div className="account-cell">
                  <span title={site.username}>
                    {visibleAccounts[site.id] ? site.username : maskUsername(site.username)}
                  </span>
                  <button type="button" className="link-button" onClick={() => toggleAccountVisibility(site.id)}>
                    👁
                  </button>
                </div>

                <div>
                  <span className="tag">{getSiteGroup(site)}</span>
                </div>

                <div className="relative-time-cell">{formatRelativeTime(site.lastUsedAt)}</div>

                <div className="row-menu-cell">
                  <SiteActionMenu onEdit={() => onEdit(site)} onDelete={() => onDelete(site.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pagination-bar">
        <div className="pagination-left">
          <div className="pagination-summary">共 {pagination.totalItems} 条</div>
        </div>

        <div className="page-chip-row pagination-right">
          <label className="field inline-field compact-field pagination-size-inline">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                {size} 条
              </option>
            ))}
          </select>
          </label>
          <button
            type="button"
            className="ghost-button"
            disabled={pagination.page <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            上一页
          </button>
          {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
            .slice(Math.max(0, pagination.page - 3), Math.max(0, pagination.page - 3) + 5)
            .map((page) => (
              <button
                key={page}
                type="button"
                className={page === pagination.page ? "page-chip active" : "page-chip"}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          <button
            type="button"
            className="ghost-button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
          >
            下一页
          </button>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="batch-action-bar">
          <span>已选择 {selectedCount} 个站点</span>
          <button type="button" className="primary-button" onClick={() => onLaunchBatch(selectedSiteIds, "已选站点")}>
            批量打开
          </button>
          <select value={batchGroupValue} onChange={(event) => setBatchGroupValue(event.target.value)}>
            <option value="__keep__">选择目标分组</option>
            <option value="__ungrouped__">未分组</option>
            {groupOptions
              .filter((groupName) => groupName !== "__all__" && groupName !== "未分组")
              .map((groupName) => (
                <option key={`batch-${groupName}`} value={groupName}>
                  {groupName}
                </option>
              ))}
          </select>
          <button type="button" className="secondary-button" onClick={handleBatchMove} disabled={batchGroupValue === "__keep__"}>
            批量移动
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={async () => {
              await Promise.all(selectedSiteIds.map((siteId) => onDelete(siteId)));
              setSelectedSiteIds([]);
            }}
          >
            批量删除
          </button>
          <button type="button" className="ghost-button" onClick={() => setSelectedSiteIds([])}>
            取消选择
          </button>
        </div>
      ) : null}
    </section>
  );
}

function GroupManagementPanel({
  groups,
  sites,
  groupCounts,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup
}) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return groups;
    }

    return groups.filter((group) =>
      [group.name, group.notes].some((value) => String(value ?? "").toLowerCase().includes(normalized))
    );
  }, [groups, search]);

  const ungroupedCount = useMemo(
    () => sites.filter((site) => getSiteGroup(site) === "未分组").length,
    [sites]
  );

  return (
    <section className="panel section-panel list-panel">
      <div className="top-bar">
        <div className="top-bar-brand">
          <span className="logo-chip">G</span>
          <div>
            <p className="eyebrow">GROUP DIRECTORY</p>
            <h2>分组管理</h2>
          </div>
        </div>

        <div className="top-bar-actions">
          <button type="button" className="ghost-button plus-button" onClick={onCreateGroup} aria-label="新增分组">
            +
          </button>
        </div>
      </div>

      <div className="control-bar soft-card">
        <input
          className="search-input control-search"
          type="search"
          placeholder="搜索分组名称或备注"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="stats-row">
        <strong>共 {groups.length} 个已维护分组</strong>
        <span>未分组站点 {ungroupedCount} 个</span>
      </div>

      <div className="list-scroll-region">
        {filteredGroups.length === 0 ? (
          <div className="empty-state">当前没有符合条件的分组，请调整搜索条件或新增分组。</div>
        ) : (
          <div className="table-shell">
            <div className="group-table table-header">
              <span>分组名称</span>
              <span>站点数量</span>
              <span>备注</span>
              <span>更新时间</span>
              <span>操作</span>
            </div>

            {filteredGroups.map((group) => (
              <div key={group.id} className="group-table table-row" title={group.notes || ""}>
                <div className="site-name-cell">
                  <strong>{group.name}</strong>
                  <span>{group.name === "未分组" ? "系统默认分组" : "手动维护分组"}</span>
                </div>

                <div className="relative-time-cell">{groupCounts.get(group.name) ?? 0}</div>

                <div className="group-notes-cell">{group.notes || "暂无备注"}</div>

                <div className="relative-time-cell">{formatRelativeTime(group.updatedAt)}</div>

                <div className="row-menu-cell">
                  <SiteActionMenu onEdit={() => onEditGroup(group.name)} onDelete={() => onDeleteGroup(group.name)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsPanel({ settings, setSettings, onSave, saving, appMeta }) {
  return (
    <section className="panel section-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SETTINGS</p>
          <h2>界面设置</h2>
          <p className="muted">{appMeta?.appDescription}</p>
        </div>
      </div>

      <div className="settings-form">
        <label className="field">
          <span>页面比例</span>
          <input
            type="range"
            min="80"
            max="140"
            step="10"
            value={settings.zoomLevel}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                zoomLevel: Number(event.target.value)
              }))
            }
          />
          <strong>{settings.zoomLevel}%</strong>
        </label>

        <label className="field">
          <span>字体大小</span>
          <input
            type="range"
            min="90"
            max="130"
            step="10"
            value={settings.fontScale}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                fontScale: Number(event.target.value)
              }))
            }
          />
          <strong>{settings.fontScale}%</strong>
        </label>

        <label className="field">
          <span>亮暗模式</span>
          <select
            value={settings.themeMode}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                themeMode: event.target.value
              }))
            }
          >
            <option value="light">明亮模式</option>
            <option value="dark">暗色模式</option>
            <option value="auto">跟随系统</option>
          </select>
        </label>
      </div>

      <div className="action-row">
        <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
          {saving ? "保存中..." : "保存界面设置"}
        </button>
      </div>
    </section>
  );
}

function PasswordVaultPanel({ vaultMeta }) {
  return (
    <section className="panel section-panel vault-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">PASSWORD VAULT</p>
          <h2>密码管理</h2>
          <p className="muted">{vaultMeta?.note}</p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="settings-card soft-card">
          <span>管理模式</span>
          <strong>{vaultMeta?.mode ?? "-"}</strong>
        </div>
        <div className="settings-card soft-card">
          <span>托管方式</span>
          <strong>{vaultMeta?.managedBy ?? "-"}</strong>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("list");
  const [sites, setSites] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [groupValidationMessage, setGroupValidationMessage] = useState("");
  const [launchResult, setLaunchResult] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [appMeta, setAppMeta] = useState(null);
  const [vaultMeta, setVaultMeta] = useState(null);
  const [directoryError, setDirectoryError] = useState("");

  useEffect(() => {
    void refreshDirectoryData();

    Promise.allSettled([
      window.siteLauncherApi.getSettings(),
      window.siteLauncherApi.getMeta(),
      window.siteLauncherApi.getPasswordVaultMeta()
    ]).then(([settingsResult, metaResult, vaultResult]) => {
      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value);
      }
      if (metaResult.status === "fulfilled") {
        setAppMeta(metaResult.value);
      }
      if (vaultResult.status === "fulfilled") {
        setVaultMeta(vaultResult.value);
      }

      if ([settingsResult, metaResult, vaultResult].some((result) => result.status === "rejected")) {
        setDirectoryError("部分应用配置加载失败，请重试或重新打开应用。");
      }
    });
  }, []);

  useEffect(() => {
    const resolvedTheme =
      settings.themeMode === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.themeMode;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.setProperty("--font-scale", `${settings.fontScale / 100}`);
  }, [settings]);

  const groupNames = useMemo(() => {
    const names = new Set(getGroupFilterOptions(sites, groups.map((group) => group.name)));
    names.add("未分组");
    return Array.from(names).sort((left, right) => left.localeCompare(right, "zh-CN"));
  }, [sites, groups]);

  const groupCounts = useMemo(() => buildGroupCounts(sites, groupNames), [sites, groupNames]);
  const drawerGroups = useMemo(
    () => [
      { name: "__all__", label: "全部分组", count: sites.length, icon: "📂" },
      ...groupNames.map((groupName) => ({
        name: groupName,
        label: groupName,
        count: groupCounts.get(groupName) ?? 0,
        icon: "📁"
      }))
    ],
    [groupCounts, groupNames, sites.length]
  );

  async function refreshDirectoryData() {
    try {
      const [nextSites, nextGroups] = await Promise.all([
        window.siteLauncherApi.listSites(),
        window.siteLauncherApi.listGroups()
      ]);
      setSites(nextSites);
      setGroups(nextGroups);
      setDirectoryError("");
      return true;
    } catch (error) {
      setDirectoryError(error?.message || "站点数据加载失败，请重试或重新打开应用。");
      return false;
    }
  }

  async function handleSaveSite() {
    const trimmedSiteUrl = String(form.siteUrl ?? "").trim();
    const trimmedLoginUrl = String(form.loginUrl ?? "").trim();
    const fallbackUrl = trimmedSiteUrl || trimmedLoginUrl;

    if (!fallbackUrl) {
      setValidationMessage("请至少填写站点地址或登录页地址。");
      return;
    }

    setSaving(true);
    setValidationMessage("");
    try {
      const payload = {
        ...form,
        siteName: String(form.siteName ?? "").trim(),
        siteUrl: normalizeUrlValue(trimmedSiteUrl || fallbackUrl),
        loginUrl: normalizeUrlValue(trimmedLoginUrl || fallbackUrl),
        username: String(form.username ?? "").trim(),
        usernameSelector: String(form.usernameSelector ?? "").trim(),
        passwordSelector: String(form.passwordSelector ?? "").trim(),
        submitSelector: String(form.submitSelector ?? "").trim(),
        groupName: String(form.groupName ?? "").trim(),
        notes: String(form.notes ?? "").trim()
      };

      await window.siteLauncherApi.saveSite(payload);
      setForm(emptyForm);
      setEditorOpen(false);
      await refreshDirectoryData();
    } catch (error) {
      if (error instanceof TypeError) {
        setValidationMessage("请输入有效的站点地址或登录页地址，例如 https://example.com。");
      } else {
        setValidationMessage(error?.message || "保存失败，请检查输入内容。");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGroup() {
    const normalizedName = String(groupForm.name ?? "").trim();
    if (!normalizedName) {
      setGroupValidationMessage("请输入分组名称。");
      return;
    }

    setSavingGroup(true);
    setGroupValidationMessage("");
    try {
      await window.siteLauncherApi.saveGroup({
        ...groupForm,
        name: normalizedName,
        notes: String(groupForm.notes ?? "").trim()
      });
      setGroupForm(emptyGroupForm);
      setGroupEditorOpen(false);
      await refreshDirectoryData();
    } catch (error) {
      setGroupValidationMessage(error?.message || "分组保存失败。");
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeleteSite(siteId) {
    try {
      await window.siteLauncherApi.deleteSite(siteId);
      await refreshDirectoryData();
      setLaunchResult({ status: "success", message: "站点已删除。" });
    } catch (error) {
      setLaunchResult({ status: "unknown_error", message: error?.message || "删除站点失败。" });
    }
  }

  async function handleDeleteGroup(groupName) {
    try {
      await window.siteLauncherApi.deleteGroup(groupName);
      if (groupFilter === groupName) {
        setGroupFilter("");
      }
      await refreshDirectoryData();
      setLaunchResult({ status: "success", message: "分组已删除，原分组站点已移动到未分组。" });
    } catch (error) {
      setLaunchResult({ status: "unknown_error", message: error?.message || "删除分组失败。" });
    }
  }

  async function handleMoveSites(siteIds, groupName) {
    try {
      await window.siteLauncherApi.moveSitesToGroup(siteIds, groupName);
      await refreshDirectoryData();
      setLaunchResult({
        status: "success",
        message: `已将 ${siteIds.length} 个站点移动到${groupName || "未分组"}。`
      });
    } catch (error) {
      setLaunchResult({ status: "unknown_error", message: error?.message || "批量移动站点失败。" });
    }
  }

  async function handleLaunch(siteId) {
    try {
      const result = await window.siteLauncherApi.launchLogin(siteId);
      setLaunchResult(result);
      await refreshDirectoryData();
    } catch (error) {
      setLaunchResult({ status: "unknown_error", message: error?.message || "打开登录页失败。" });
    }
  }

  async function handleLaunchBatch(siteIds, groupLabel) {
    try {
      const results = await window.siteLauncherApi.launchBatch(siteIds);
      const successCount = results.filter((item) => item.status === "success").length;
      setLaunchResult({
        status: successCount === results.length ? "success" : "unknown_error",
        message: `${groupLabel} 已批量打开 ${results.length} 个站点，成功 ${successCount} 个。`
      });
      await refreshDirectoryData();
    } catch (error) {
      setLaunchResult({ status: "unknown_error", message: error?.message || "批量打开站点失败。" });
    }
  }

  async function handleExport() {
    const filePath = await window.siteLauncherApi.exportExcel();
    if (filePath) {
      setLaunchResult({
        status: "success",
        message: `已导出到：${filePath}`
      });
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const saved = await window.siteLauncherApi.saveSettings(settings);
      setSettings(saved);
    } catch (error) {
      setDirectoryError(error?.message || "保存界面设置失败。");
    } finally {
      setSavingSettings(false);
    }
  }

  function openCreateDrawer() {
    setForm(emptyForm);
    setValidationMessage("");
    setEditorOpen(true);
  }

  function openEditDrawer(site) {
    setForm({
      ...site,
      password: ""
    });
    setValidationMessage("");
    setEditorOpen(true);
  }

  function openCreateGroup() {
    setGroupForm(emptyGroupForm);
    setGroupValidationMessage("");
    setGroupEditorOpen(true);
  }

  function openEditGroup(groupName) {
    const targetGroup = groups.find((group) => group.name === groupName);
    if (!targetGroup) {
      return;
    }

    setGroupForm({
      id: targetGroup.id,
      name: targetGroup.name,
      notes: targetGroup.notes ?? ""
    });
    setGroupValidationMessage("");
    setGroupEditorOpen(true);
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        appMeta={appMeta}
        groupItems={drawerGroups}
        groupFilter={groupFilter}
        onSelectGroup={(groupName) => {
          setGroupFilter(groupName === "__all__" ? "" : groupName);
          setCurrentPage(1);
        }}
        onOpenSettings={() => setActiveView("settings")}
      />

      <main className="content-area">
        {directoryError ? (
          <div className="status-banner status-unknown_error app-error-banner">
            <strong>加载或操作失败</strong>
            <span>{directoryError}</span>
            <button type="button" className="secondary-button" onClick={() => void refreshDirectoryData()}>
              重试
            </button>
          </div>
        ) : null}

        {activeView === "list" ? (
          <SiteList
            sites={sites}
            groups={groups}
            groupCounts={groupCounts}
            search={search}
            setSearch={setSearch}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            pageSize={pageSize}
            setPageSize={setPageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onLaunch={handleLaunch}
            onEdit={openEditDrawer}
            onDelete={handleDeleteSite}
            onCreate={openCreateDrawer}
            onExport={handleExport}
            onLaunchBatch={handleLaunchBatch}
            onMoveSites={handleMoveSites}
            launchResult={launchResult}
            onOpenImport={() => setActiveView("import")}
          />
        ) : null}

        {activeView === "groups" ? (
          <GroupManagementPanel
            groups={groups}
            sites={sites}
            groupCounts={groupCounts}
            onCreateGroup={openCreateGroup}
            onEditGroup={openEditGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        ) : null}

        {activeView === "import" ? <ImportPanel onImported={refreshDirectoryData} /> : null}

        {activeView === "settings" ? (
          <>
            <SettingsPanel
              settings={settings}
              setSettings={setSettings}
              onSave={handleSaveSettings}
              saving={savingSettings}
              appMeta={appMeta}
            />
            <PasswordVaultPanel vaultMeta={vaultMeta} />
          </>
        ) : null}
      </main>

      <SiteEditorDrawer
        open={editorOpen}
        form={form}
        setForm={setForm}
        onSave={handleSaveSite}
        onClose={() => {
          setValidationMessage("");
          setEditorOpen(false);
        }}
        saving={saving}
        groups={groups}
        validationMessage={validationMessage}
      />

      <GroupEditorModal
        open={groupEditorOpen}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        onSave={handleSaveGroup}
        onClose={() => {
          setGroupValidationMessage("");
          setGroupEditorOpen(false);
        }}
        saving={savingGroup}
        validationMessage={groupValidationMessage}
      />
    </div>
  );
}
