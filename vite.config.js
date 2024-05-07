import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "index.js"),
      name: "formatCss",
      fileName: "format-css",
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["css-tree/parser"],
    },
  },
  plugins: [
    dts(),
  ],
})
