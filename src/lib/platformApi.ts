import { upload } from '@vercel/blob/client';
import type {
  AuthSession,
  ArtistRank,
  ChickenLeg,
  Collaboration,
  LoginInput,
  PlatformUser,
  PricingItem,
  PublicPortfolio,
  RegisterInput,
  RegistrationStatus,
  Review,
  ShareLinkState,
  Work,
} from '../types/platform';

const API_BASE = ((import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const SESSION_TOKEN_KEY = 'studio_aruo_platform_session_token';

type ApiErrorBody = {
  error?: string;
  message?: string;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getSessionToken() {
  if (!canUseStorage()) {
    return '';
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

export function setSessionToken(token: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorCode(body: unknown, fallback: string) {
  if (typeof body === 'string') {
    return body || fallback;
  }

  if (body && typeof body === 'object') {
    const error = (body as ApiErrorBody).error?.trim();
    if (error) {
      return error;
    }

    const message = (body as ApiErrorBody).message?.trim();
    if (message) {
      return message;
    }
  }

  return fallback;
}

export async function platformRequest<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = options;
  const token = getSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const body = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(getErrorCode(body, `HTTP_${response.status}`));
  }

  return body as T;
}

function normalizeUser(user: PlatformUser): PlatformUser {
  return {
    ...user,
    avatarUrl: user.avatarUrl ?? '',
    bio: user.bio ?? '',
    pricingNote: user.pricingNote ?? '',
    balance: user.balance ?? 0,
    isBusy: user.isBusy ?? true,
    availableDate: user.availableDate ?? '',
  };
}

export async function registerAccount(input: RegisterInput): Promise<AuthSession> {
  const data = await platformRequest<{ user: PlatformUser; token: string }>('/api/auth/register', {
    method: 'POST',
    json: input,
  });
  setSessionToken(data.token);
  return { user: normalizeUser(data.user), token: data.token };
}

export async function fetchRegistrationStatus(): Promise<RegistrationStatus> {
  return platformRequest('/api/registration-status', {
    method: 'GET',
  });
}

export async function loginAccount(input: LoginInput): Promise<AuthSession> {
  const data = await platformRequest<{ user: PlatformUser; token: string }>('/api/auth/login', {
    method: 'POST',
    json: input,
  });
  setSessionToken(data.token);
  return { user: normalizeUser(data.user), token: data.token };
}

export async function fetchMe(): Promise<PlatformUser> {
  const data = await platformRequest<{ user: PlatformUser }>('/api/auth/me', {
    method: 'GET',
  });
  return normalizeUser(data.user);
}

export async function logoutAccount(): Promise<void> {
  clearSessionToken();
}

export async function fetchArtists(): Promise<ArtistRank[]> {
  const data = await platformRequest<{ artists: ArtistRank[] }>('/api/artists', {
    method: 'GET',
  });
  return data.artists;
}

export async function fetchArtist(id: string): Promise<{
  artist: PlatformUser;
  works: Work[];
  pricing: PricingItem[];
  reviews: Review[];
}> {
  return platformRequest(`/api/artists/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function fetchShareLink(): Promise<ShareLinkState> {
  return platformRequest('/api/share-link', { method: 'GET' });
}

export async function generateShareLink(): Promise<ShareLinkState> {
  return platformRequest('/api/share-link', { method: 'POST' });
}

export async function disableShareLink(): Promise<ShareLinkState> {
  return platformRequest('/api/share-link', { method: 'DELETE' });
}

export async function fetchPublicPortfolio(token: string): Promise<PublicPortfolio> {
  const path = '/api/public-portfolio?token=' + encodeURIComponent(token);
  return platformRequest(path, { method: 'GET' });
}

export async function fetchWorks(userId?: string): Promise<Work[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const data = await platformRequest<{ works: Work[] }>(`/api/works${query}`, {
    method: 'GET',
  });
  return data.works;
}

export async function createWork(input: {
  title: string;
  description?: string;
  imageUrl: string;
  imagePath?: string;
}): Promise<Work> {
  const data = await platformRequest<{ work: Work }>('/api/works', {
    method: 'POST',
    json: input,
  });
  return data.work;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export async function uploadWorkImage(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<{ url: string; pathname: string }> {
  const token = getSessionToken();
  const extension = file.type === 'image/webp' ? 'webp' : 'jpg';
  const uniqueName =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await upload(`works/${uniqueName}.${extension}`, file, {
    access: 'public',
    handleUploadUrl: `${API_BASE}/api/blob/upload-token`,
    contentType: file.type,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onUploadProgress: (event) => onProgress?.(event.percentage),
  });

  return {
    url: result.url,
    pathname: result.pathname,
  };
}

export async function uploadAvatarImage(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<{ url: string; pathname: string }> {
  const token = getSessionToken();
  const result = await upload(`avatars/${Date.now()}-${safeFileName(file.name)}`, file, {
    access: 'public',
    handleUploadUrl: `${API_BASE}/api/blob/upload-token`,
    contentType: file.type,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onUploadProgress: (event) => onProgress?.(event.percentage),
  });

  return {
    url: result.url,
    pathname: result.pathname,
  };
}

export async function fetchPricing(artistId: string): Promise<PricingItem[]> {
  const data = await platformRequest<{ items: PricingItem[] }>(`/api/pricing?artistId=${encodeURIComponent(artistId)}`, {
    method: 'GET',
  });
  return data.items;
}

export async function fetchCollaborations(): Promise<Collaboration[]> {
  const data = await platformRequest<{ collaborations: Collaboration[] }>('/api/collaborations', {
    method: 'GET',
  });
  return data.collaborations;
}

export async function createCollaboration(input: {
  artistId: string;
  title: string;
  note?: string;
}): Promise<Collaboration> {
  const data = await platformRequest<{ collaboration: Collaboration }>('/api/collaborations', {
    method: 'POST',
    json: input,
  });
  return data.collaboration;
}

export async function updateCollaborationStatus(
  id: string,
  status: 'active' | 'completed'
): Promise<Collaboration> {
  const data = await platformRequest<{ collaboration: Collaboration }>(
    `/api/collaborations/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      json: { status },
    }
  );
  return data.collaboration;
}

export async function updateProfile(input: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  pricingNote?: string;
  isBusy?: boolean;
  availableDate?: string;
}): Promise<PlatformUser> {
  const data = await platformRequest<{ user: PlatformUser }>('/api/profile', {
    method: 'PUT',
    json: input,
  });
  return normalizeUser(data.user);
}

export async function savePricing(items: PricingItem[]): Promise<PricingItem[]> {
  const data = await platformRequest<{ items: PricingItem[] }>('/api/pricing', {
    method: 'PUT',
    json: { items },
  });
  return data.items;
}

export async function topUpBalance(amount: number): Promise<PlatformUser> {
  const data = await platformRequest<{ user: PlatformUser }>('/api/balance/top-up', {
    method: 'POST',
    json: { amount },
  });
  return normalizeUser(data.user);
}

export async function createReview(input: {
  collaborationId: string;
  rating: number;
  content: string;
}): Promise<Review> {
  const data = await platformRequest<{ review: Review }>('/api/reviews', {
    method: 'POST',
    json: input,
  });
  return data.review;
}

export async function giveChickenLeg(input: {
  collaborationId: string;
  amount: number;
  message?: string;
}): Promise<ChickenLeg> {
  const data = await platformRequest<{ chickenLeg: ChickenLeg }>('/api/chicken-legs', {
    method: 'POST',
    json: input,
  });
  return data.chickenLeg;
}
