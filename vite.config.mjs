import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(() => {
  return {
    base: './',
    build: {
      outDir: 'build',
      // Avisa cuando un chunk supere ~700 KB (no falla, solo lo reporta)
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Separamos las librerías pesadas en chunks propios para que se
          // descarguen sólo cuando se usan y se cacheen aparte del código
          // de la aplicación. Mejora arranque y navegación.
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux', 'redux'],
            'vendor-coreui': ['@coreui/react', '@coreui/coreui', '@coreui/icons', '@coreui/icons-react', '@coreui/utils'],
            'vendor-charts': ['chart.js', '@coreui/chartjs', '@coreui/react-chartjs'],
            'vendor-excel': ['exceljs', 'xlsx'],
            'vendor-pdf': ['jspdf'],
            'vendor-datepicker': ['react-datepicker', 'date-fns'],
          },
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
