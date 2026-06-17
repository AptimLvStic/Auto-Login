import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_SETTINGS } from "../shared/site.js";

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function mapSiteRow(row) {
  return {
    id: row.id,
    siteName: row.site_name,
    siteUrl: row.site_url,
    loginUrl: row.login_url,
    username: row.username,
    usernameSelector: row.username_selector,
    passwordSelector: row.password_selector,
    submitSelector: row.submit_selector,
    groupName: row.group_name ?? "",
    notes: row.notes,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasPassword: Boolean(row.password_encrypted)
  };
}

function mapSettingsRow(row) {
  return {
    zoomLevel: Number(row.zoom_level ?? DEFAULT_SETTINGS.zoomLevel),
    fontScale: Number(row.font_scale ?? DEFAULT_SETTINGS.fontScale),
    themeMode: row.theme_mode ?? DEFAULT_SETTINGS.themeMode
  };
}

function mapGroupRow(row) {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      site_name TEXT NOT NULL,
      site_url TEXT NOT NULL,
      login_url TEXT NOT NULL,
      username TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      username_selector TEXT NOT NULL,
      password_selector TEXT NOT NULL,
      submit_selector TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_unique_name_login
      ON sites (site_name, login_url);

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      zoom_level INTEGER NOT NULL,
      font_scale INTEGER NOT NULL,
      theme_mode TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureColumn(db, "sites", "group_name", "TEXT NOT NULL DEFAULT ''");

  db.prepare(`
    INSERT INTO app_settings (id, zoom_level, font_scale, theme_mode)
    VALUES (1, @zoom_level, @font_scale, @theme_mode)
    ON CONFLICT(id) DO NOTHING
  `).run({
    zoom_level: DEFAULT_SETTINGS.zoomLevel,
    font_scale: DEFAULT_SETTINGS.fontScale,
    theme_mode: DEFAULT_SETTINGS.themeMode
  });

  const listStatement = db.prepare(`
    SELECT
      id,
      site_name,
      site_url,
      login_url,
      username,
      password_encrypted,
      username_selector,
      password_selector,
      submit_selector,
      group_name,
      notes,
      last_used_at,
      created_at,
      updated_at
    FROM sites
    ORDER BY group_name COLLATE NOCASE ASC, site_name COLLATE NOCASE ASC
  `);

  const selectForLoginStatement = db.prepare(`
    SELECT *
    FROM sites
    WHERE id = ?
  `);

  const deleteStatement = db.prepare(`
    DELETE FROM sites
    WHERE id = ?
  `);

  const updateLastUsedStatement = db.prepare(`
    UPDATE sites
    SET last_used_at = ?, updated_at = ?
    WHERE id = ?
  `);

  const insertStatement = db.prepare(`
    INSERT INTO sites (
      id,
      site_name,
      site_url,
      login_url,
      username,
      password_encrypted,
      username_selector,
      password_selector,
      submit_selector,
      group_name,
      notes,
      last_used_at,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @site_name,
      @site_url,
      @login_url,
      @username,
      @password_encrypted,
      @username_selector,
      @password_selector,
      @submit_selector,
      @group_name,
      @notes,
      @last_used_at,
      @created_at,
      @updated_at
    )
    ON CONFLICT(site_name, login_url) DO UPDATE SET
      site_url = excluded.site_url,
      username = excluded.username,
      password_encrypted = excluded.password_encrypted,
      username_selector = excluded.username_selector,
      password_selector = excluded.password_selector,
      submit_selector = excluded.submit_selector,
      group_name = excluded.group_name,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  const updateStatement = db.prepare(`
    UPDATE sites
    SET
      site_name = @site_name,
      site_url = @site_url,
      login_url = @login_url,
      username = @username,
      password_encrypted = @password_encrypted,
      username_selector = @username_selector,
      password_selector = @password_selector,
      submit_selector = @submit_selector,
      group_name = @group_name,
      notes = @notes,
      updated_at = @updated_at
    WHERE id = @id
  `);

  const settingsStatement = db.prepare(`
    SELECT zoom_level, font_scale, theme_mode
    FROM app_settings
    WHERE id = 1
  `);

  const listGroupsStatement = db.prepare(`
    SELECT id, name, notes, created_at, updated_at
    FROM groups
    ORDER BY name COLLATE NOCASE ASC
  `);

  const getGroupByNameStatement = db.prepare(`
    SELECT id, name, notes, created_at, updated_at
    FROM groups
    WHERE name = ?
  `);

  const saveGroupStatement = db.prepare(`
    INSERT INTO groups (id, name, notes, created_at, updated_at)
    VALUES (@id, @name, @notes, @created_at, @updated_at)
    ON CONFLICT(name) DO UPDATE SET
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  const updateGroupStatement = db.prepare(`
    UPDATE groups
    SET name = @name,
        notes = @notes,
        updated_at = @updated_at
    WHERE id = @id
  `);

  const deleteGroupStatement = db.prepare(`
    DELETE FROM groups
    WHERE id = ?
  `);

  const renameSiteGroupStatement = db.prepare(`
    UPDATE sites
    SET group_name = @next_group_name,
        updated_at = @updated_at
    WHERE group_name = @previous_group_name
  `);

  const clearSiteGroupStatement = db.prepare(`
    UPDATE sites
    SET group_name = '',
        updated_at = @updated_at
    WHERE group_name = @group_name
  `);

  const moveSiteToGroupStatement = db.prepare(`
    UPDATE sites
    SET group_name = @group_name,
        updated_at = @updated_at
    WHERE id = @id
  `);

  const siteGroupNamesStatement = db.prepare(`
    SELECT DISTINCT group_name
    FROM sites
    WHERE TRIM(COALESCE(group_name, '')) <> ''
    ORDER BY group_name COLLATE NOCASE ASC
  `);

  const saveSettingsStatement = db.prepare(`
    UPDATE app_settings
    SET zoom_level = @zoom_level,
        font_scale = @font_scale,
        theme_mode = @theme_mode
    WHERE id = 1
  `);

  return {
    dbPath,
    listSites() {
      return listStatement.all().map(mapSiteRow);
    },
    getSiteById(id) {
      return selectForLoginStatement.get(id);
    },
    deleteSite(id) {
      deleteStatement.run(id);
    },
    touchSiteLastUsed(id) {
      const timestamp = new Date().toISOString();
      updateLastUsedStatement.run(timestamp, timestamp, id);
    },
    upsertImportedSites(records) {
      const now = new Date().toISOString();
      const transaction = db.transaction((rows) => {
        rows.forEach((row) => {
          const normalizedGroupName = String(row.groupName ?? "").trim();
          if (normalizedGroupName) {
            const existingGroup = getGroupByNameStatement.get(normalizedGroupName);
            if (!existingGroup) {
              saveGroupStatement.run({
                id: randomUUID(),
                name: normalizedGroupName,
                notes: "",
                created_at: now,
                updated_at: now
              });
            }
          }

          insertStatement.run({
            id: row.id ?? randomUUID(),
            site_name: row.siteName,
            site_url: row.siteUrl,
            login_url: row.loginUrl,
            username: row.username,
            password_encrypted: row.passwordEncrypted,
            username_selector: row.usernameSelector,
            password_selector: row.passwordSelector,
            submit_selector: row.submitSelector,
            group_name: normalizedGroupName,
            notes: row.notes ?? "",
            last_used_at: null,
            created_at: now,
            updated_at: now
          });
        });
      });

      transaction(records);
    },
    saveSite(record) {
      const now = new Date().toISOString();
      const normalizedGroupName = String(record.groupName ?? "").trim();
      if (normalizedGroupName) {
        const existingGroup = getGroupByNameStatement.get(normalizedGroupName);
        if (!existingGroup) {
          saveGroupStatement.run({
            id: randomUUID(),
            name: normalizedGroupName,
            notes: "",
            created_at: now,
            updated_at: now
          });
        }
      }

      if (record.id) {
        updateStatement.run({
          id: record.id,
          site_name: record.siteName,
          site_url: record.siteUrl,
          login_url: record.loginUrl,
          username: record.username,
          password_encrypted: record.passwordEncrypted,
          username_selector: record.usernameSelector,
          password_selector: record.passwordSelector,
          submit_selector: record.submitSelector,
          group_name: normalizedGroupName,
          notes: record.notes ?? "",
          updated_at: now
        });
        return record.id;
      }

      const id = randomUUID();
      insertStatement.run({
        id,
        site_name: record.siteName,
        site_url: record.siteUrl,
        login_url: record.loginUrl,
        username: record.username,
        password_encrypted: record.passwordEncrypted,
        username_selector: record.usernameSelector,
        password_selector: record.passwordSelector,
        submit_selector: record.submitSelector,
        group_name: normalizedGroupName,
        notes: record.notes ?? "",
        last_used_at: null,
        created_at: now,
        updated_at: now
      });
      return id;
    },
    getSettings() {
      return mapSettingsRow(settingsStatement.get());
    },
    saveSettings(settings) {
      saveSettingsStatement.run({
        zoom_level: settings.zoomLevel,
        font_scale: settings.fontScale,
        theme_mode: settings.themeMode
      });
      return this.getSettings();
    },
    listGroups() {
      const existingGroups = listGroupsStatement.all().map(mapGroupRow);
      const existingNames = new Set(existingGroups.map((group) => group.name));
      const siteGroups = siteGroupNamesStatement.all();
      const now = new Date().toISOString();

      siteGroups.forEach((row) => {
        const groupName = String(row.group_name ?? "").trim();
        if (!groupName || existingNames.has(groupName)) {
          return;
        }

        saveGroupStatement.run({
          id: randomUUID(),
          name: groupName,
          notes: "",
          created_at: now,
          updated_at: now
        });
      });

      return listGroupsStatement.all().map(mapGroupRow);
    },
    saveGroup(record) {
      const now = new Date().toISOString();
      if (record.id) {
        const previousGroup = listGroupsStatement.all().find((group) => group.id === record.id);
        updateGroupStatement.run({
          id: record.id,
          name: record.name,
          notes: record.notes ?? "",
          updated_at: now
        });

        if (previousGroup && previousGroup.name !== record.name) {
          renameSiteGroupStatement.run({
            previous_group_name: previousGroup.name,
            next_group_name: record.name,
            updated_at: now
          });
        }

        return record.id;
      }

      const id = randomUUID();
      saveGroupStatement.run({
        id,
        name: record.name,
        notes: record.notes ?? "",
        created_at: now,
        updated_at: now
      });
      return id;
    },
    deleteGroup(groupName) {
      const normalizedName = String(groupName ?? "").trim();
      if (!normalizedName) {
        return;
      }

      const now = new Date().toISOString();
      const targetGroup = getGroupByNameStatement.get(normalizedName);
      if (!targetGroup) {
        return;
      }

      clearSiteGroupStatement.run({
        group_name: normalizedName,
        updated_at: now
      });
      deleteGroupStatement.run(targetGroup.id);
    },
    moveSitesToGroup(siteIds, groupName) {
      const now = new Date().toISOString();
      const normalizedGroupName = String(groupName ?? "").trim();
      if (normalizedGroupName) {
        const existingGroup = getGroupByNameStatement.get(normalizedGroupName);
        if (!existingGroup) {
          saveGroupStatement.run({
            id: randomUUID(),
            name: normalizedGroupName,
            notes: "",
            created_at: now,
            updated_at: now
          });
        }
      }

      const transaction = db.transaction((ids) => {
        ids.forEach((id) => {
          moveSiteToGroupStatement.run({
            id,
            group_name: normalizedGroupName,
            updated_at: now
          });
        });
      });

      transaction(siteIds);
    },
    close() {
      db.close();
    }
  };
}
