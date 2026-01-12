export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthData {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  timestamp: string;
  services?: {
    database?: boolean;
    redis?: boolean;
    rabbitmq?: boolean;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RequestData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}
