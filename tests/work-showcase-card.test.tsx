import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import test from "node:test";
import { WorkShowcaseCard } from "../src/components/WorkShowcaseCard";
import type { Work } from "../src/types/platform";

test("does not render the work title as visible card text", () => {
  const work: Work = {
    id: "work-1",
    userId: "artist-1",
    title: "hidden-file-name-0001",
    imageUrl: "https://example.com/work.jpg",
  };

  const html = renderToStaticMarkup(<WorkShowcaseCard work={work} />);

  assert.equal(html.includes("<h4"), false);
  assert.equal(html.includes('alt="hidden-file-name-0001"'), true);
});
