type ShareUrlHeaders = {
  origin?: string;
  referer?: string;
  forwardedProto?: string;
  forwardedHost?: string;
  host?: string;
};

function cleanOrigin(value: string | undefined) {
  return value?.replace(/\/$/, "") || "";
}

function cleanConfiguredPublicOrigin(value: string | undefined) {
  const origin = cleanOrigin(value);
  if (!origin) return "";

  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function isLocalOrigin(value: string) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function buildPublicShareUrl(headers: ShareUrlHeaders, token: string) {
  if (!token) return "";

  const appUrl = cleanConfiguredPublicOrigin(process.env.APP_URL);
  const origin = cleanOrigin(headers.origin);
  if (appUrl && isLocalOrigin(origin)) {
    return `${appUrl}/#/share/${encodeURIComponent(token)}`;
  }

  if (origin) {
    return `${origin}/#/share/${encodeURIComponent(token)}`;
  }

  if (headers.referer) {
    try {
      const refererOrigin = new URL(headers.referer).origin;
      if (appUrl && isLocalOrigin(refererOrigin)) {
        return `${appUrl}/#/share/${encodeURIComponent(token)}`;
      }
      return `${refererOrigin}/#/share/${encodeURIComponent(token)}`;
    } catch {
      // Fall through to proxy headers when the referer is malformed.
    }
  }

  const host = headers.forwardedHost || headers.host;
  if (!host) {
    return appUrl
      ? `${appUrl}/#/share/${encodeURIComponent(token)}`
      : `/#/share/${encodeURIComponent(token)}`;
  }

  const fallbackOrigin = `${headers.forwardedProto || "https"}://${host}`;
  if (appUrl && isLocalOrigin(fallbackOrigin)) {
    return `${appUrl}/#/share/${encodeURIComponent(token)}`;
  }

  return `${fallbackOrigin}/#/share/${encodeURIComponent(token)}`;
}
