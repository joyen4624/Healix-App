// src/types/api.ts

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  data?: {
    id: string;
    email: string;
  };
}

export interface ApiError {
  success: boolean;
  message: string;
}
