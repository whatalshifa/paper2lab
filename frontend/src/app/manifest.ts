import type { MetadataRoute } from "next";

/** Lets a phone add Paper2Lab to its home screen, opening on the library in the journal's paper colour. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paper2Lab",
    short_name: "Paper2Lab",
    description: "Read any research paper at your level, with every explanation backed by a quote from the paper.",
    start_url: "/library",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#f6f1e7",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
