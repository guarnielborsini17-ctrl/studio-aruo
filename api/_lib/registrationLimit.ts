const DEFAULT_BETA_USER_LIMIT = 10;
export const REGISTER_USER_LOCK_ID = 734981245;

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
  limit?: number;
};

export type LimitedRegistrationResult =
  | { kind: 'created'; row: Record<string, unknown> }
  | { kind: 'full' };

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
  const { sql } = await import('./db');
  const rows = await sql`
    SELECT COUNT(*)::int AS registered
    FROM users
  `;

  return toRegistrationStatus(Number(rows[0]?.registered ?? 0));
}

export async function registerUserWithinLimit(
  input: LimitedRegistrationInput,
): Promise<LimitedRegistrationResult> {
  const limit = normalizeBetaUserLimit(input.limit ?? getBetaUserLimit());
  const { sql } = await import('./db');
  const rows = await sql`
    WITH registration_lock AS (
      SELECT pg_advisory_xact_lock(${REGISTER_USER_LOCK_ID})
    ),
    capacity AS (
      SELECT COUNT(*)::int AS registered
      FROM users
      CROSS JOIN registration_lock
    ),
    inserted AS (
      INSERT INTO users (username, password_hash, role, display_name)
      SELECT
        ${input.username},
        ${input.passwordHash},
        ${input.role},
        ${input.displayName}
      FROM capacity
      WHERE registered < ${limit}
      RETURNING *
    )
    SELECT inserted.*
    FROM inserted
  `;

  return rows[0]
    ? { kind: 'created', row: rows[0] as Record<string, unknown> }
    : { kind: 'full' };
}
