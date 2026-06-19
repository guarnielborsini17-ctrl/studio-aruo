import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicShareUrl } from "../api/_lib/shareUrl";

test("uses configured public app URL when generating a share link from localhost", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://vercel-demo-platform.vercel.app";

  try {
    const url = buildPublicShareUrl(
      {
        origin: "http://127.0.0.1:3000",
        host: "127.0.0.1:3000",
      },
      "share-token",
    );

    assert.equal(
      url,
      "https://vercel-demo-platform.vercel.app/#/share/share-token",
    );
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});

test("keeps the request origin for deployed public domains", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://vercel-demo-platform.vercel.app";

  try {
    const url = buildPublicShareUrl(
      {
        origin: "https://custom.example.com",
        host: "custom.example.com",
      },
      "share-token",
    );

    assert.equal(url, "https://custom.example.com/#/share/share-token");
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});

test("ignores placeholder public app URL values", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "MY_APP_URL";

  try {
    const url = buildPublicShareUrl(
      {
        origin: "http://127.0.0.1:3000",
        host: "127.0.0.1:3002",
      },
      "share-token",
    );

    assert.notEqual(url, "MY_APP_URL/#/share/share-token");
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});
