export type Photo = {
  src: string;
  w: number;
  h: number;
  alt?: string;
};

export type Clip = {
  src: string;
  poster: string;
  w: number;
  h: number;
  duration: number; // seconds
  caption?: string;
};

export type Socials = {
  instagram?: string;
  tiktok?: string;
  x?: string;
  snapchat?: string;
  reddit?: string;
  threads?: string;
  youtube?: string;
  telegram?: string;
};

export type Creator = {
  slug: string;
  name: string;
  handle?: string;
  tagline: string;
  bio: string;
  age?: number;
  location?: string;
  region?: string; // state / country used for /from/[region] pages
  height?: string;
  hair?: string;
  eyes?: string;
  tags: string[];
  fansUrl: string;
  free: boolean;
  badge?: "new" | "hot" | "trending" | null;
  featured?: number; // lower = earlier
  addedAt: string; // ISO date
  updatedAt: string; // ISO date
  socials: Socials;
  photos: Photo[];
  clips: Clip[];
  placeholder?: boolean;
};

export type VipItem = {
  kind: "photo" | "clip";
  src: string;
  poster?: string;
  w: number;
  h: number;
  duration?: number;
};

export type VipCreator = {
  slug: string;
  name: string;
  tagline: string;
  fansUrl: string;
  photo?: string;
  location?: string;
  age?: number;
};

export type VipContent = {
  items: Record<string, VipItem[]>;
  creators: VipCreator[];
};

export type VipSummary = {
  perCreator: Record<string, { photos: number; clips: number }>;
  lockedCreators: number;
};
