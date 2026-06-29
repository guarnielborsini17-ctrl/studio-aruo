import assert from "node:assert/strict";
import test from "node:test";
import { parseProfileUpdate } from "../api/_lib/profileInput";

test("does not provide an empty date parameter when availableDate is omitted", () => {
  const parsed = parseProfileUpdate({ pricingNote: "说明" });

  assert.equal(parsed.hasAvailableDate, false);
  assert.equal(parsed.availableDate, null);
});

test("keeps provided valid availableDate values", () => {
  const parsed = parseProfileUpdate({ availableDate: "2026-06-20" });

  assert.equal(parsed.hasAvailableDate, true);
  assert.equal(parsed.availableDate, "2026-06-20");
});
