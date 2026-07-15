import path from "node:path";
import { pathToFileURL } from "node:url";

export function resolveRendererUrl(mainDirectory, devServerUrl = process.env.VITE_DEV_SERVER_URL) {
  if (devServerUrl) {
    return devServerUrl;
  }

  return pathToFileURL(path.join(mainDirectory, "../../dist/index.html")).toString();
}
