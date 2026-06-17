"use client";

import { useState } from "react";

interface UseBeneficiarioDialogReturn<T> {
  selectedItem: T | null;
  detailOpen: boolean;
  handleOpenDetail: (item: T) => void;
  handleCloseDetail: () => void;
}

/**
 * Hook genérico para el dialog de detalles de un beneficiario.
 *
 * Uso:
 * ```tsx
 * const { selectedItem, detailOpen, handleOpenDetail, handleCloseDetail } =
 *   useBeneficiarioDialog<MiBeneficiario>();
 * ```
 */
export function useBeneficiarioDialog<T>(): UseBeneficiarioDialogReturn<T> {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleOpenDetail = (item: T) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
  };

  return {
    selectedItem,
    detailOpen,
    handleOpenDetail,
    handleCloseDetail,
  };
}
