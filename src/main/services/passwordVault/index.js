import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function createVaultKey(namespace, machineKey) {
  return crypto
    .createHash("sha256")
    .update(`${namespace}|${machineKey}`)
    .digest();
}

export function createPasswordVault(options = {}) {
  const {
    namespace = "auto-login-password-vault",
    machineKey = "local",
    storagePath = "",
    fallbackSecret = ""
  } = options;

  const key = createVaultKey(namespace, machineKey);

  function encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(value), "utf8"),
      cipher.final()
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  }

  function decrypt(cipherText) {
    const payload = Buffer.from(String(cipherText), "base64");
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  function persistHint(name) {
    if (!storagePath) {
      return;
    }

    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify({ name, at: new Date().toISOString() }, null, 2));
  }

  return {
    encrypt,
    decrypt,
    persistHint,
    fallbackSecret
  };
}

