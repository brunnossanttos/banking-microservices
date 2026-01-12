export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserWithPassword {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: 'active' | 'inactive' | 'blocked' | 'pending_verification';
}
