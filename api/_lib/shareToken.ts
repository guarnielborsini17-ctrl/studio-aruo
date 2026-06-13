import crypto from 'node:crypto';

type ShareRow = {
  share_token?: string | null;
  share_enabled?: boolean | null;
  share_updated_at?: string | Date | null;
};

export function createShareToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function mapTimestamp(value: string | Date | null | undefined) {
  if (!value) return '';
  return value instanceof Date ? value.toISOString() : String(value);
}

export function mapShareState(row: ShareRow) {
  return {
    token: row.share_token || '',
    enabled: row.share_enabled ?? false,
    updatedAt: mapTimestamp(row.share_updated_at),
  };
}
