import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Movie Tracker",
    short_name: "Movies",
    description: "Rate films and TV series out of 5, to one decimal place.",
    start_url: "/",
    display: "standalone",
    background_color: "#14181c",
    theme_color: "#14181c",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
