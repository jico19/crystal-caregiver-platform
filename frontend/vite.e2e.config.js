import { mergeConfig } from "vite";
import config from "./vite.config.js";

export default mergeConfig(config, {
  server: {
    port: 5174,
    proxy: { "/api": { target: "http://127.0.0.1:8001", changeOrigin: false } },
  },
});
