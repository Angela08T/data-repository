import { SubgerenciaType } from "@/lib/constants";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  permissions: string[];
  subgerencia: SubgerenciaType;
  cargo?: string;
  avatar?: string;
  is_super?: boolean;
  role?: string;
  moduleAbilities?: Record<string, string[]>;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  isLogin: boolean;
  moduleLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface MeModule {
  id: string | undefined;
  name: string | undefined;
  abilities: string[];
}

export interface MeResponse {
  user: {
    id: string;
    username: string;
    name: string;
    lastname: string;
    email: string;
  };
  is_super: boolean;
  role: string | null;
  modules: MeModule[];
}

export interface LoginResponse {
  access_token: string;
}

// El ResponseInterceptor del backend envuelve todas las respuestas exitosas
export interface ApiResponse<T> {
  message: string;
  data: T;
}
