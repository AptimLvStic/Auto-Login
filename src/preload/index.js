import electron from "electron";

const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld("siteLauncherApi", {
  getMeta: () => ipcRenderer.invoke("app:getMeta"),
  getSettings: () => ipcRenderer.invoke("app:getSettings"),
  saveSettings: (settings) => ipcRenderer.invoke("app:saveSettings", settings),
  getPasswordVaultMeta: () => ipcRenderer.invoke("app:getPasswordVaultMeta"),
  listSites: () => ipcRenderer.invoke("sites:list"),
  listGroups: () => ipcRenderer.invoke("groups:list"),
  saveGroup: (payload) => ipcRenderer.invoke("groups:save", payload),
  deleteGroup: (groupName) => ipcRenderer.invoke("groups:delete", groupName),
  moveSitesToGroup: (siteIds, groupName) =>
    ipcRenderer.invoke("groups:moveSites", siteIds, groupName),
  pickExcelFile: () => ipcRenderer.invoke("sites:pickExcelFile"),
  downloadTemplate: () => ipcRenderer.invoke("sites:downloadTemplate"),
  exportExcel: () => ipcRenderer.invoke("sites:exportExcel"),
  getExcelPreview: (filePath) => ipcRenderer.invoke("sites:getExcelPreview", filePath),
  importExcel: (filePath, mapping) =>
    ipcRenderer.invoke("sites:importExcel", filePath, mapping),
  saveSite: (payload) => ipcRenderer.invoke("sites:save", payload),
  deleteSite: (siteId) => ipcRenderer.invoke("sites:delete", siteId),
  launchLogin: (siteId) => ipcRenderer.invoke("sites:launchLogin", siteId),
  launchBatch: (siteIds) => ipcRenderer.invoke("sites:launchBatch", siteIds)
});
