import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three-dependencies',
              test: /[\\/]node_modules[\\/](?:three|@react-three)[\\/]/,
              maxSize: 450_000,
            },
            {
              name: 'pdf-dependencies',
              test: /[\\/]node_modules[\\/](?:pdfjs-dist|react-pdf)[\\/]/,
              maxSize: 450_000,
            },
          ],
        },
      },
    },
  },
})
