import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AIWAH_LOGIN_REGISTER_ARGUMENT,
  aiwahRuntimeRecordPath,
  applyAiwahRuntimeEnvironment,
  handleAiwahLoginItemAction,
  validateAiwahRuntimeRecord,
} from "./aiwah-workspace-runtime.mjs";

test("Aiwah runtime record is opt-in, private and workspace-contained", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "omb-aiwah-runtime-"));
  const workspace = path.join(home, "workspace");
  const file = aiwahRuntimeRecordPath(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const record = {
    schemaVersion: 1,
    enabled: true,
    workspace,
    dataDir: path.join(workspace, ".runtime", "openmaus", "data"),
    userDataDir: path.join(workspace, ".runtime", "openmaus", "electron"),
  };
  try {
    fs.writeFileSync(file, JSON.stringify(record), { mode: 0o600 });
    const environment = {};
    assert.deepEqual(applyAiwahRuntimeEnvironment(environment, home), validateAiwahRuntimeRecord(record));
    assert.equal(environment.OMB_DATA_DIR, record.dataDir);
    assert.equal(environment.OMB_USER_DATA_DIR, record.userDataDir);
    assert.equal(environment.OMB_COLLABORATIVE_WORKSPACE_ROOT, workspace);
    assert.equal(environment.AIWAH_WORKSPACE, workspace);
    assert.equal(Object.keys(environment).some((key) => /KEY|TOKEN|SECRET|PASSWORD/.test(key)), false);
    assert.throws(() => validateAiwahRuntimeRecord({ ...record, dataDir: path.join(home, "outside") }), /inside/);
    if (process.platform !== "win32") {
      fs.chmodSync(file, 0o644);
      assert.throws(() => applyAiwahRuntimeEnvironment({}, home), /other users/);
    }
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("native Login Item registration completes before Electron creates a window", (context) => {
  if (process.platform !== "darwin") return context.skip("macOS ServiceManagement contract");
  let applied;
  let exited = false;
  const output = [];
  const app = {
    setLoginItemSettings(value) { applied = value; },
    getLoginItemSettings() { return { openAtLogin: true, executableWillLaunchAtLogin: true, status: "enabled" }; },
    exit(code) { assert.equal(code, 0); exited = true; },
  };
  assert.equal(handleAiwahLoginItemAction(app, ["OpenMausBot", AIWAH_LOGIN_REGISTER_ARGUMENT], (line) => output.push(line)), true);
  assert.equal(applied.openAtLogin, true);
  assert.deepEqual(applied.args, ["--aiwah-workspace-login"]);
  assert.equal(exited, true);
  assert.deepEqual(JSON.parse(output[0]), { openAtLogin: true, executableWillLaunchAtLogin: true, status: "enabled" });
});
