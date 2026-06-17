import { useState, useCallback } from "react";
import axios, { AxiosRequestConfig } from "axios";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logout, setLoading } from "@/redux/slices/authSlice";
import { showError } from "@/lib/utils/swalConfig";

const API_BASE = (process.env.NEXT_PUBLIC_PVL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

const buildUrl = (path: string) => `${API_BASE}/${path.replace(/^\//, "")}`;

interface FetchOptions extends AxiosRequestConfig {
  showErrorAlert?: boolean;
}

export const useFetch = () => {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);
  const [loading, setLocalLoading] = useState(false);

  /**
   * Maneja errores de las peticiones
   */
  const handleError = useCallback(
    (error: any, showAlert: boolean = true) => {
      console.error("Fetch error:", error);

      // Si es error 401 (no autorizado), hacer logout
      if (error.response?.status === 401) {
        dispatch(logout());
        if (showAlert) {
          showError("Sesión expirada", "Por favor, inicia sesión nuevamente");
        }
        // Redirigir al login
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
        return;
      }

      // Mostrar mensaje de error
      if (showAlert) {
        const errorMessage = error.response?.data?.message || error.message || "Error en la petición";
        showError("Error", errorMessage);
      }

      throw error;
    },
    [dispatch]
  );

  /**
   * GET request
   */
  const getData = useCallback(
    async <T = any>(url: string, options: FetchOptions = {}): Promise<T> => {
      const { showErrorAlert = true, ...axiosConfig } = options;

      try {
        setLocalLoading(true);
        dispatch(setLoading(true));

        const response = await axios.get(buildUrl(url), {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            ...axiosConfig.headers,
          },
          ...axiosConfig,
        });

        return response.data;
      } catch (error) {
        handleError(error, showErrorAlert);
        throw error;
      } finally {
        setLocalLoading(false);
        dispatch(setLoading(false));
      }
    },
    [token, dispatch, handleError]
  );

  /**
   * POST request
   */
  const postData = useCallback(
    async <T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> => {
      const { showErrorAlert = true, ...axiosConfig } = options;

      try {
        setLocalLoading(true);
        dispatch(setLoading(true));

        const response = await axios.post(buildUrl(url), data, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
            ...axiosConfig.headers,
          },
          ...axiosConfig,
        });

        return response.data;
      } catch (error) {
        handleError(error, showErrorAlert);
        throw error;
      } finally {
        setLocalLoading(false);
        dispatch(setLoading(false));
      }
    },
    [token, dispatch, handleError]
  );

  /**
   * PUT request
   */
  const putData = useCallback(
    async <T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> => {
      const { showErrorAlert = true, ...axiosConfig } = options;

      try {
        setLocalLoading(true);
        dispatch(setLoading(true));

        const response = await axios.put(buildUrl(url), data, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
            ...axiosConfig.headers,
          },
          ...axiosConfig,
        });

        return response.data;
      } catch (error) {
        handleError(error, showErrorAlert);
        throw error;
      } finally {
        setLocalLoading(false);
        dispatch(setLoading(false));
      }
    },
    [token, dispatch, handleError]
  );

  /**
   * PATCH request
   */
  const patchData = useCallback(
    async <T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> => {
      const { showErrorAlert = true, ...axiosConfig } = options;

      try {
        setLocalLoading(true);
        dispatch(setLoading(true));

        const response = await axios.patch(buildUrl(url), data, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
            ...axiosConfig.headers,
          },
          ...axiosConfig,
        });

        return response.data;
      } catch (error) {
        handleError(error, showErrorAlert);
        throw error;
      } finally {
        setLocalLoading(false);
        dispatch(setLoading(false));
      }
    },
    [token, dispatch, handleError]
  );

  /**
   * DELETE request
   */
  const deleteData = useCallback(
    async <T = any>(url: string, options: FetchOptions = {}): Promise<T> => {
      const { showErrorAlert = true, ...axiosConfig } = options;

      try {
        setLocalLoading(true);
        dispatch(setLoading(true));

        const response = await axios.delete(buildUrl(url), {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            ...axiosConfig.headers,
          },
          ...axiosConfig,
        });

        return response.data;
      } catch (error) {
        handleError(error, showErrorAlert);
        throw error;
      } finally {
        setLocalLoading(false);
        dispatch(setLoading(false));
      }
    },
    [token, dispatch, handleError]
  );

  return {
    loading,
    getData,
    postData,
    putData,
    patchData,
    deleteData,
  };
};
