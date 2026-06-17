import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  PAGE_SIZE_OPTIONS,
  buildInitialFieldMapping,
  filterSites,
  getGroupFilterOptions,
  getSiteGroup,
  groupSitesByHost,
  paginateItems,
  sortSitesByRecent
} from "../src/shared/site.js";

const sampleSites = [
  {
    id: "1",
    siteName: "CRM Portal",
    siteUrl: "https://crm.example.com",
    loginUrl: "https://crm.example.com/login",
    username: "alice",
    groupName: "业务系统",
    notes: "sales",
    lastUsedAt: "2026-06-15T10:00:00.000Z"
  },
  {
    id: "2",
    siteName: "Finance Hub",
    siteUrl: "https://finance.example.com",
    loginUrl: "https://finance.example.com/login",
    username: "bob",
    groupName: "",
    notes: "expense",
    lastUsedAt: null
  }
];

test("filterSites searches across multiple fields", () => {
  const result = filterSites(sampleSites, "业务");
  assert.equal(result.length, 1);
  assert.equal(result[0].siteName, "CRM Portal");
});

test("sortSitesByRecent sorts latest first", () => {
  const result = sortSitesByRecent(sampleSites);
  assert.equal(result[0].id, "1");
});

test("getSiteGroup prefers manual group", () => {
  assert.equal(getSiteGroup(sampleSites[0]), "业务系统");
});

test("groupSitesByHost groups by manual group or hostname", () => {
  const result = groupSitesByHost(sampleSites);
  assert.equal(result["业务系统"].length, 1);
  assert.equal(result["finance.example.com"].length, 1);
});

test("buildInitialFieldMapping detects group header", () => {
  const result = buildInitialFieldMapping(["site_name", "group_name"]);
  assert.equal(result.groupName, "group_name");
});

test("DEFAULT_SETTINGS keeps expected defaults", () => {
  assert.equal(DEFAULT_SETTINGS.zoomLevel, 100);
  assert.equal(DEFAULT_SETTINGS.fontScale, 100);
  assert.equal(DEFAULT_SETTINGS.themeMode, "light");
});

test("getGroupFilterOptions merges groups and site groups", () => {
  const result = getGroupFilterOptions(sampleSites, ["财务系统", "业务系统"]);
  assert.deepEqual(result, ["财务系统", "业务系统", "finance.example.com"]);
});

test("paginateItems returns bounded page data", () => {
  const result = paginateItems(sampleSites, 3, 1);
  assert.equal(result.page, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.items[0].id, "2");
});

test("PAGE_SIZE_OPTIONS exposes expected values", () => {
  assert.deepEqual(PAGE_SIZE_OPTIONS, [10, 20, 50, 100]);
});
