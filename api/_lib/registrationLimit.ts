import { sql } from './db';

const DEFAULT_BETA_USER_LIMIT = 10;

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

  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0
    ? limit
    : DEFAULT_BETA_USER_LIMIT;
}

export function toRegistrationStatus(
  registered: number,
  limit = getBetaUserLimit(),
): RegistrationStatus {
  const normalizedRegistered = Math.max(0, Math.trunc(registered));
  const normalizedLimit = Math.max(0, Math.trunc(limit));
  const remaining = Math.max(0, normalizedLimit - normalizedRegistered);

  return {
    limit: normalizedLimit,
    registered: normalizedRegistered,
    remaining,
    open: remaining > 0,
  };
}

export async function readRegistrationStatus(): Promise<RegistrationStatus> {
  const rows = await sql`
    SELECT COUNT(*)::int AS registered
    FROM users
  `;

  return toRegistrationStatus(Number(rows[0]?.registered ?? 0));
}
