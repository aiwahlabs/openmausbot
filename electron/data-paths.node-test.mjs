import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { applyDesktopUserDataOverride, desktopUserDataOverride } from "./data-paths.mjs";

test("desktop user data override is optional and must be absolute", () => {
  assert.equal(desktopUserDataOverride({}), null);
  assert.equal(desktopUserDataOverride({ OMB_USER_DATA_DIR: "" }), null);
  assert.throws(() => desktopUserDataOverride({ OMB_USER_DATA_DIR: "relative" }), /absolute/);
  assert.throws(() => desktopUserDataOverride({ OMB_USER_DATA_DIR: "/tmp/bad\npath" }), /absolute directory path/);
});

test("desktop user data override creates a private directory before setPath", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omb-user-data-"));
  const directory = path.join(root, "electron");
  const calls = [];
  try {
    assert.equal(applyDesktopUserDataOverride({ setPath: (...args) => calls.push(args) }, { OMB_USER_DATA_DIR: directory }), directory);
    assert.deepEqual(calls, [["userData", directory]]);
    if (process.platform !== "win32") assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("desktop user data override rejects a symlink", (context) => {
  if (process.platform === "win32") return context.skip("symlink fixture requires elevated Windows permissions");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omb-user-data-link-"));
  const target = path.join(root, "target");
  const link = path.join(root, "link");
  try {
    fs.mkdirSync(target);
    fs.symlinkSync(target, link);
    assert.throws(() => applyDesktopUserDataOverride({ setPath() {} }, { OMB_USER_DATA_DIR: link }), /ordinary directory/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
