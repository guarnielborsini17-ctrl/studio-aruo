export type UserRole = 'designer' | 'artist';

export type PlatformUser = {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  pricingNote?: string;
  balance?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Work = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUrl: string;
  imagePath?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ArtistRank = PlatformUser & {
  reviewCount: number;
  averageRating: number;
  chickenLegTotal: number;
  collaborationCount: number;
  workCount: number;
  score?: number;
};

export type PricingItem = {
  id?: string;
  artistId?: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CollaborationStatus = 'active' | 'completed';

export type Collaboration = {
  id: string;
  designerId: string;
  artistId: string;
  status: CollaborationStatus | string;
  title: string;
  note?: string;
  artistName?: string;
  designerName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Review = {
  id: string;
  collaborationId: string;
  designerId: string;
  artistId: string;
  rating: number;
  content: string;
  createdAt?: string;
  designerName?: string;
  designerAvatarUrl?: string;
};

export type ChickenLeg = {
  id: string;
  collaborationId: string;
  designerId: string;
  artistId: string;
  amount: number;
  message?: string;
  createdAt?: string;
};

export type AuthSession = {
  user: PlatformUser;
  token: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  displayName?: string;
  role: UserRole;
};
