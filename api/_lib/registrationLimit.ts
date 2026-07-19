const DEFAULT_BETA_USER_LIMIT = 9;
export const REGISTER_USER_LOCK_ID = 734981245;
export const PERMANENT_ACCOUNT_USERNAME = '1723670343';

function normalizeBetaUserLimit(value: number) {
  return Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_BETA_USER_LIMIT;
}

export type LimitedRegistrationInput = {
  username: string;
  passwordHash: string;
  role: 'designer' | 'artist';
  displayName: string;
  inviteCode: string;
  limit?: number;
};

export type LimitedRegistrationResult =
  | { kind: 'created'; row: Record<string, unknown> }
  | { kind: 'full' }
  | { kind: 'invalid_invite_code' }
  | { kind: 'invite_code_used' };

export type RegistrationStatus = {
  limit: number;
  registered: number;
  remaining: number;
  open: boolean;
};

export function getBetaUserLimit(
  value: string | undefined = process.env.BETA_USER_LIMIT,
) {
  if (!value || !/^\d+$/.test(value)) {
    return DEFAULT_BETA_USER_LIMIT;
  }

  return normalizeBetaUserLimit(Number(value));
}

export function toRegistrationStatus(
  registered: number,
  limit = getBetaUserLimit(),
): RegistrationStatus {
  const truncatedRegistered = Math.trunc(registered);
  const normalizedRegistered = Number.isSafeInteger(truncatedRegistered)
    ? Math.max(0, truncatedRegistered)
    : 0;
  const normalizedLimit = normalizeBetaUserLimit(limit);
  const remaining = Math.max(0, normalizedLimit - normalizedRegistered);

  return {
    limit: normalizedLimit,
    registered: normalizedRegistered,
    remaining,
    open: remaining > 0,
  };
}

export async function readRegistrationStatus(): Promise<RegistrationStatus> {
  const { sql } = await import('./db.js');
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE used_by_user_id IS NOT NULL)::int AS registered,
      COUNT(*) FILTER (WHERE used_by_user_id IS NULL)::int AS remaining
    FROM invite_codes
  `;

  const registered = Number(rows[0]?.registered ?? 0);
  const remaining = Number(rows[0]?.remaining ?? 0);
  return {
    limit: registered + remaining,
    registered,
    remaining,
    open: remaining > 0,
  };
}

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase();
}

export async function markPermanentAccount(
  username = PERMANENT_ACCOUNT_USERNAME,
) {
  const { sql } = await import('./db.js');
  await sql`
    UPDATE users
    SET account_type = 'permanent', updated_at = now()
    WHERE username = ${username}
  `;
}

export async function registerUserWithinLimit(
  input: LimitedRegistrationInput,
): Promise<LimitedRegistrationResult> {
  const limit = normalizeBetaUserLimit(input.limit ?? getBetaUserLimit());
  const inviteCode = normalizeInviteCode(input.inviteCode);
  if (!inviteCode) {
    return { kind: 'invalid_invite_code' };
  }

  const { sql } = await import('./db.js');
  const rows = await sql`
    WITH registration_lock AS (
      SELECT pg_advisory_xact_lock(${REGISTER_USER_LOCK_ID})
    ),
    invite AS (
      SELECT code, used_by_user_id
      FROM invite_codes
      CROSS JOIN registration_lock
      WHERE code = ${inviteCode}
    ),
    capacity AS (
      SELECT COUNT(*)::int AS registered
      FROM invite_codes
      CROSS JOIN registration_lock
      WHERE used_by_user_id IS NOT NULL
    ),
    inserted AS (
      INSERT INTO users (username, password_hash, role, display_name)
      SELECT
        ${input.username},
        ${input.passwordHash},
        ${input.role},
        ${input.displayName}
      FROM capacity
      CROSS JOIN invite
      WHERE registered < ${limit}
        AND invite.used_by_user_id IS NULL
      RETURNING *
    ),
    consumed AS (
      UPDATE invite_codes
      SET used_by_user_id = inserted.id,
          used_at = now()
      FROM inserted
      WHERE invite_codes.code = ${inviteCode}
      RETURNING invite_codes.code
    )
    SELECT
      (SELECT COUNT(*)::int FROM invite) AS invite_count,
      (SELECT used_by_user_id FROM invite LIMIT 1) AS invite_used_by_user_id,
      capacity.registered,
      (SELECT COUNT(*)::int FROM consumed) AS consumed_count,
      inserted.*
    FROM capacity
    LEFT JOIN inserted ON true
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  if (row?.id) {
    return { kind: 'created', row };
  }
  if (!row || Number(row.invite_count || 0) === 0) {
    return { kind: 'invalid_invite_code' };
  }
  if (row.invite_used_by_user_id) {
    return { kind: 'invite_code_used' };
  }
  return { kind: 'full' };
}
