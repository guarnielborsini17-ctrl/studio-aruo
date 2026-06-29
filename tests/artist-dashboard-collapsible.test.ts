import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/pages/ArtistDashboard.tsx", "utf8");

test("artist dashboard uses collapsible panels for dashboard sections", () => {
  assert.match(source, /function CollapsiblePanel/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /setCollapsedPanels/);
});

test("all artist dashboard areas are wrapped by collapsible panels", () => {
  for (const panelId of ["profile", "availability", "share", "pricing", "works"]) {
    assert.match(source, new RegExp(`id="${panelId}"`));
  }
});
