import type { MetadataRoute } from "next";
import { BRAND_MARK_SRC, PRODUCT_DESCRIPTION, PRODUCT_DISPLAY_NAME } from "@/lib/product";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_DISPLAY_NAME,
    short_name: PRODUCT_DISPLAY_NAME,
    description: PRODUCT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#041e42",
    theme_color: "#041e42",
    icons: [
      {
        src: BRAND_MARK_SRC,
        sizes: "640x754",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
