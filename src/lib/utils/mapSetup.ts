/**
 * Configura los iconos por defecto de Leaflet para Next.js.
 *
 * Leaflet en Next.js no puede resolver las URLs de imágenes del icono por defecto
 * automáticamente porque webpack renombra los assets.
 * Este fix los apunta directamente al CDN de Leaflet 1.7.1.
 *
 * @example
 * ```ts
 * import L from "leaflet";
 * import { setupLeafletIcons } from "@/lib/utils/mapSetup";
 *
 * if (typeof window !== "undefined") setupLeafletIcons(L);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupLeafletIcons(L: any): void {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}
