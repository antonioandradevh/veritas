import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    }
  },
  optimizeDeps: {
    include: [
      'lexical', 
      '@lexical/react/LexicalComposer',
      '@lexical/react/LexicalRichTextPlugin',
      '@lexical/react/LexicalContentEditable',
      '@lexical/react/LexicalHistoryPlugin',
      '@lexical/react/LexicalOnChangePlugin',
      '@lexical/react/LexicalListPlugin',
      '@lexical/react/LexicalLinkPlugin',
      '@lexical/react/LexicalErrorBoundary',
      '@lexical/react/LexicalComposerContext',
      '@lexical/utils', 
      '@lexical/selection', 
      '@lexical/html', 
      '@lexical/rich-text', 
      '@lexical/list', 
      '@lexical/link', 
      '@lexical/history'
    ]
  }
})