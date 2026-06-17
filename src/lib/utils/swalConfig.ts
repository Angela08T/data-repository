import Swal from "sweetalert2";
import { SWAL_CONFIG } from "@/lib/constants";

/**
 * SweetAlert2 personalizado con configuración del sistema
 */
export const CustomSwal = Swal.mixin({
  confirmButtonColor: SWAL_CONFIG.confirmButtonColor,
  cancelButtonColor: SWAL_CONFIG.cancelButtonColor,
  confirmButtonText: SWAL_CONFIG.confirmButtonText,
  cancelButtonText: SWAL_CONFIG.cancelButtonText,
  customClass: {
    popup: "rounded-2xl",
    confirmButton: "px-6 py-2 rounded-full font-semibold",
    cancelButton: "px-6 py-2 rounded-full font-semibold",
  },
});

/**
 * Muestra una alerta de éxito
 */
export const showSuccess = (title: string, text?: string) => {
  return CustomSwal.fire({
    icon: "success",
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
  });
};

/**
 * Muestra una alerta de error
 */
export const showError = (title: string, text?: string) => {
  return CustomSwal.fire({
    icon: "error",
    title,
    text,
  });
};

/**
 * Muestra una alerta de advertencia
 */
export const showWarning = (title: string, text?: string) => {
  return CustomSwal.fire({
    icon: "warning",
    title,
    text,
  });
};

/**
 * Muestra una confirmación
 */
export const showConfirm = (title: string, text?: string) => {
  return CustomSwal.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
  });
};

/**
 * Muestra una confirmación de eliminación
 */
export const showDeleteConfirm = (itemName?: string) => {
  return CustomSwal.fire({
    icon: "warning",
    title: "¿Estás seguro?",
    text: itemName
      ? `Se eliminará ${itemName}. Esta acción no se puede deshacer.`
      : "Esta acción no se puede deshacer.",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc3545",
  });
};
