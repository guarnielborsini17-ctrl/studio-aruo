import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const sql = neon(process.env.DATABASE_URL);

export async function setupSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('designer', 'artist')),
      display_name TEXT NOT NULL,
      avatar_url TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      balance INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pricing_note TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_busy BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS available_date DATE NOT NULL DEFAULT CURRENT_DATE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS share_updated_at TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      image_path TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pricing_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      unit TEXT NOT NULL DEFAULT 'item',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS collaborations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      designer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_id_designer_artist_key UNIQUE (id, designer_id, artist_id);
    EXCEPTION
      WHEN duplicate_object OR duplicate_table THEN NULL;
    END $$;
  `;

  await sql`
    CREATE OR REPLACE FUNCTION enforce_collaboration_role_invariant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      designer_role TEXT;
      artist_role TEXT;
    BEGIN
      IF NEW.designer_id = NEW.artist_id THEN
        RAISE EXCEPTION 'collaboration participants must be different users'
          USING ERRCODE = '23514';
      END IF;

      SELECT role
        INTO designer_role
        FROM users
        WHERE id = NEW.designer_id;

      IF designer_role IS DISTINCT FROM 'designer' THEN
        RAISE EXCEPTION 'collaboration designer must have role designer'
          USING ERRCODE = '23514';
      END IF;

      SELECT role
        INTO artist_role
        FROM users
        WHERE id = NEW.artist_id;

      IF artist_role IS DISTINCT FROM 'artist' THEN
        RAISE EXCEPTION 'collaboration artist must have role artist'
          USING ERRCODE = '23514';
      END IF;

      RETURN NEW;
    END;
    $$;
  `;

  await sql`DROP TRIGGER IF EXISTS collaborations_role_invariant_trigger ON collaborations`;

  await sql`
    CREATE TRIGGER collaborations_role_invariant_trigger
    BEFORE INSERT OR UPDATE ON collaborations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_collaboration_role_invariant()
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collaboration_id UUID NOT NULL UNIQUE REFERENCES collaborations(id) ON DELETE CASCADE,
      designer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE reviews
        ADD CONSTRAINT reviews_collaboration_scope_fkey
        FOREIGN KEY (collaboration_id, designer_id, artist_id)
        REFERENCES collaborations(id, designer_id, artist_id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chicken_legs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
      designer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL CHECK (amount > 0),
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE chicken_legs
        ADD CONSTRAINT chicken_legs_collaboration_scope_fkey
        FOREIGN KEY (collaboration_id, designer_id, artist_id)
        REFERENCES collaborations(id, designer_id, artist_id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;
}

type UserRow = {
  id: string;
  username: string;
  role: 'designer' | 'artist';
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  pricing_note?: string | null;
  is_busy?: boolean | null;
  available_date?: string | Date | null;
  share_token?: string | null;
  share_enabled?: boolean | null;
  share_updated_at?: string | Date | null;
  balance?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

type WorkRow = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  image_url: string;
  image_path?: string | null;
  created_at?: string;
  updated_at?: string;
};

function mapDateOnly(value: string | Date | null | undefined) {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function mapUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    pricingNote: row.pricing_note || '',
    balance: Number(row.balance || 0),
    isBusy: row.is_busy ?? true,
    availableDate: mapDateOnly(row.available_date),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export function mapWork(row: WorkRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    imageUrl: row.image_url,
    imagePath: row.image_path || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}
