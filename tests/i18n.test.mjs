import test from "node:test";
import assert from "node:assert/strict";
import { languageFrom, resolveLanguage, text } from "../.test-build/i18n.mjs";

test("Missing and invalid settings default to following Obsidian", () => {
  for (const value of [undefined, null, {}, 1, "de", "auto"])
    assert.equal(languageFrom(value), "auto");
});
test("Existing explicit language choices survive upgrade", () => {
  for (const value of ["zh", "en"]) assert.equal(languageFrom(value), value);
});
test("Auto resolves the current host language each time", () => {
  for (const locale of ["zh", "zh-CN", "zh-TW", "ZH-cn"])
    assert.equal(resolveLanguage("auto", locale), "zh");
  for (const locale of ["en", "de", "ja", ""])
    assert.equal(resolveLanguage("auto", locale), "en");
  assert.equal(text(resolveLanguage("auto", "zh"), "auto"), "跟随 Obsidian");
  assert.equal(text(resolveLanguage("auto", "en"), "auto"), "Follow Obsidian");
});
test("Explicit language overrides the host language", () => {
  assert.equal(resolveLanguage("en", "zh"), "en");
  assert.equal(resolveLanguage("zh", "en"), "zh");
});
