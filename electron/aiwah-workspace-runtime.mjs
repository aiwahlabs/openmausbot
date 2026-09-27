import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const AIWAH_LOGIN_ARGUMENT = "--aiwah-workspace-login";
export const AIWAH_LOGIN_REGISTER_ARGUMENT = "--aiwah-register-login-item";
export const AIWAH_LOGIN_REMOVE_ARGUMENT = "--aiwah-remove-login-item";
export const AIWAH_LOGIN_STATUS_ARGUMENT = "--aiwah-login-item-status";

export function aiwahRuntimeRecordPath(home = os.homedir()) {
  return path.join(home, ".aiwah", "openmaus", "runtime.json");
}

function privateRegularFile(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Aiwah OpenMaus runtime record must be a regular file");
  if (process.platform !== "win32" && (info.mode & 0o077) !== 0) {
    throw new Error("Aiwah OpenMaus runtime record must not be readable by other users");
  }
}

function absoluteDirectory(value, name) {
  if (typeof value !== "string" || value.trim() !== value || !path.isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error(`${name} must be one absolute directory path`);
  }
  return path.normalize(value);
}

export function validateAiwahRuntimeRecord(value) {
  if (!value || value.schemaVersion !== 1 || value.enabled !== true) {
    throw new Error("Aiwah OpenMaus runtime record must use enabled schemaVersion 1");
  }
  const workspace = absoluteDirectory(value.workspace, "workspace");
  const dataDir = absoluteDirectory(value.dataDir, "dataDir");
  const userDataDir = absoluteDirectory(value.userDataDir, "userDataDir");
  const inside = (candidate) => candidate === workspace || candidate.startsWith(`${workspace}${path.sep}`);
  if (!inside(dataDir) || !inside(userDataDir)) {
    throw new Error("Aiwah OpenMaus data directories must stay inside the configured workspace");
  }
  return { schemaVersion: 1, enabled: true, workspace, dataDir, userDataDir };
}

export function readAiwahRuntimeRecord(home = os.homedir()) {
  const file = aiwahRuntimeRecordPath(home);
  if (!fs.existsSync(file)) return null;
  privateRegularFile(file);
  return validateAiwahRuntimeRecord(JSON.parse(fs.readFileSync(file, "utf8")));
}

export function applyAiwahRuntimeEnvironment(environment = process.env, home = os.homedir()) {
  const record = readAiwahRuntimeRecord(home);
  if (!record) return null;
  const values = {
    OMB_DATA_DIR: record.dataDir,
    OMB_USER_DATA_DIR: record.userDataDir,
    OMB_COLLABORATIVE_WORKSPACE_ROOT: record.workspace,
    AIWAH_WORKSPACE: record.workspace,
  };
  for (const [name, value] of Object.entries(values)) {
    if (!environment[name]) environment[name] = value;
  }
  return record;
}

export function handleAiwahLoginItemAction(app, argv = process.argv, output = console.log) {
  if (process.platform !== "darwin") return false;
  const action = argv.find((argument) => [
    AIWAH_LOGIN_REGISTER_ARGUMENT,
    AIWAH_LOGIN_REMOVE_ARGUMENT,
    AIWAH_LOGIN_STATUS_ARGUMENT,
  ].includes(argument));
  if (!action) return false;
  const settings = {
    path: process.execPath,
    args: [AIWAH_LOGIN_ARGUMENT],
  };
  if (action === AIWAH_LOGIN_REGISTER_ARGUMENT) app.setLoginItemSettings({ ...settings, openAtLogin: true });
  if (action === AIWAH_LOGIN_REMOVE_ARGUMENT) app.setLoginItemSettings({ ...settings, openAtLogin: false });
  const current = app.getLoginItemSettings(settings);
  output(JSON.stringify({
    openAtLogin: Boolean(current.openAtLogin),
    executableWillLaunchAtLogin: Boolean(current.executableWillLaunchAtLogin),
    status: typeof current.status === "string" ? current.status : undefined,
  }));
  app.exit(0);
  return true;
}
