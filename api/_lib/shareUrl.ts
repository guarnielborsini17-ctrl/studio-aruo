type ShareUrlHeaders = {
  origin?: string;
  referer?: string;
  forwardedProto?: string;
  forwardedHost?: string;
  host?: string;
};

export function buildPublicShareUrl(headers: ShareUrlHeaders, token: string) {
  if (!token) return '';

  const origin = headers.origin?.replace(/\/$/, '');
  if (origin) {
    return `${origin}/#/share/${encodeURIComponent(token)}`;
  }

  if (headers.referer) {
    try {
      const refererOrigin = new URL(headers.referer).origin;
      return `${refererOrigin}/#/share/${encodeURIComponent(token)}`;
    } catch {
      // Fall through to proxy headers when the referer is malformed.
    }
  }

  const host = headers.forwardedHost || headers.host;
  if (!host) {
    return `/#/share/${encodeURIComponent(token)}`;
  }

  return `${headers.forwardedProto || 'https'}://${host}/#/share/${encodeURIComponent(token)}`;
}
