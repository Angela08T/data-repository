import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, User } from "@/types/auth";
import { encryptAndStore, getAndDecrypt, removeFromStorage, STORAGE_KEYS } from "@/lib/utils/localStorageUtils";

// Estado inicial
const initialState: AuthState = {
  token: null,
  user: null,
  loading: false,
  isLogin: false,
  moduleLoading: false,
};

/**
 * Carga el estado desde localStorage
 */
const loadStateFromLocalStorage = (): AuthState => {
  try {
    const savedState = getAndDecrypt(STORAGE_KEYS.AUTH_STATE);
    if (savedState) {
      return {
        ...initialState,
        ...savedState,
      };
    }
  } catch (error) {
    console.error("Error al cargar estado de localStorage:", error);
  }
  return initialState;
};

/**
 * Guarda el estado en localStorage
 */
const saveStateToLocalStorage = (state: AuthState) => {
  try {
    const stateToSave = {
      token: state.token,
      user: state.user,
      isLogin: state.isLogin,
    };
    encryptAndStore(STORAGE_KEYS.AUTH_STATE, stateToSave);
  } catch (error) {
    console.error("Error al guardar estado en localStorage:", error);
  }
};

// Slice de autenticación
const authSlice = createSlice({
  name: "auth",
  initialState: loadStateFromLocalStorage(),
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isLogin = true;
      state.loading = false;
      saveStateToLocalStorage(state);
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isLogin = false;
      state.loading = false;
      state.moduleLoading = false;
      removeFromStorage(STORAGE_KEYS.AUTH_STATE);
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setModuleLoading: (state, action: PayloadAction<boolean>) => {
      state.moduleLoading = action.payload;
    },

    setIsLogin: (state, action: PayloadAction<boolean>) => {
      state.isLogin = action.payload;
    },

    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
        saveStateToLocalStorage(state);
      }
    },
  },
});

export const { loginSuccess, logout, setLoading, setModuleLoading, setIsLogin, updateUser } = authSlice.actions;

export default authSlice.reducer;
