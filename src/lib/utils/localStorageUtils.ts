import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || "SGDH_SECRET_KEY_2026";

/**
 * Encripta un objeto y lo guarda en localStorage
 */
export const encryptAndStore = (key: string, data: any): void => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    if (typeof window !== "undefined") {
      localStorage.setItem(key, encrypted);
    }
  } catch (error) {
    console.error("Error al encriptar y guardar:", error);
  }
};

/**
 * Obtiene y desencripta un objeto de localStorage
 */
export const getAndDecrypt = (key: string): any | null => {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const encrypted = localStorage.getItem(key);
    if (!encrypted) {
      return null;
    }

    const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!jsonString) {
      return null;
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error al desencriptar:", error);
    return null;
  }
};

/**
 * Elimina un item de localStorage
 */
export const removeFromStorage = (key: string): void => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error("Error al eliminar de localStorage:", error);
  }
};

/**
 * Limpia todo el localStorage
 */
export const clearStorage = (): void => {
  try {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  } catch (error) {
    console.error("Error al limpiar localStorage:", error);
  }
};

// Claves de localStorage
export const STORAGE_KEYS = {
  AUTH_STATE: "sgdh_auth_state",
  USER_PREFERENCES: "sgdh_user_preferences",
};
