import fs from "node:fs";
import path from "node:path";

/**
 * Resolve the optional desktop-owned data root before Electron creates a
 * session. OMB_DATA_DIR belongs to the harness; this separate path owns
 * cookies, safeStorage ciphertext, CUA descriptors and window state.
 *
 * An explicit environment variable is useful for source worktrees and
 * managed installations that need every mutable byte below one private root.
 * It must be absolute: a desktop launched from Finder has no reliable cwd.
 */
export function desktopUserDataOverride(environment = process.env) {
  const raw = environment.OMB_USER_DATA_DIR;
  if (raw === undefined || raw === "") return null;
  if (typeof raw !== "string" || raw.trim() !== raw || /[\r\n\0]/.test(raw)) {
    throw new Error("OMB_USER_DATA_DIR must be one absolute directory path");
  }
  if (!path.isAbsolute(raw)) throw new Error("OMB_USER_DATA_DIR must be absolute");
  return path.normalize(raw);
}

export function applyDesktopUserDataOverride(app, environment = process.env) {
  const directory = desktopUserDataOverride(environment);
  if (directory === null) return null;
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const info = fs.lstatSync(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error("OMB_USER_DATA_DIR must be an ordinary directory, not a link");
  }
  if (process.platform !== "win32") fs.chmodSync(directory, 0o700);
  app.setPath("userData", directory);
  return directory;
}
