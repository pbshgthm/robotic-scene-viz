import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/robotic-scene-viz/",
  plugins: [react()],
  server: {
    host: true,
    port: 50101,
    strictPort: true,
  },
});
