import crypto from "node:crypto";
import os from "node:os";
import { createPasswordVault } from "./services/passwordVault/index.js";

function createFallbackKey(namespace) {
  return crypto
    .createHash("sha256")
    .update(`${namespace}|${os.hostname()}|${os.userInfo().username}`)
    .digest();
}

function encryptWithFallback(plainText, namespace) {
  const key = createFallbackKey(namespace);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptWithFallback(cipherText, namespace) {
  const payload = Buffer.from(cipherText, "base64");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const key = createFallbackKey(namespace);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString("utf8");
}

export function createSecurityService(options = {}) {
  const {
    safeStorage,
    namespace = "auto-login",
    forceFallback = false,
    vaultStoragePath = ""
  } = options;

  const canUseSafeStorage =
    !forceFallback &&
    safeStorage &&
    typeof safeStorage.isEncryptionAvailable === "function" &&
    safeStorage.isEncryptionAvailable();

  const passwordVault = createPasswordVault({
    namespace: `${namespace}-vault`,
    machineKey: `${os.hostname()}|${os.userInfo().username}`,
    storagePath: vaultStoragePath
  });

  return {
    encryptionMode: canUseSafeStorage ? "safeStorage+vault" : "fallback+vault",
    passwordVault,
    encrypt(plainText) {
      if (canUseSafeStorage) {
        return safeStorage.encryptString(plainText).toString("base64");
      }

      return encryptWithFallback(plainText, namespace);
    },
    decrypt(cipherText) {
      if (canUseSafeStorage) {
        return safeStorage.decryptString(Buffer.from(cipherText, "base64"));
      }

      return decryptWithFallback(cipherText, namespace);
    }
  };
}
