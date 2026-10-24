import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './app/router';
import { CategoriesProvider } from './data/categories';
import { DialogProvider } from './components/ConfirmDialog';
import { applyTheme, getStoredTheme } from './theme/themes';
import './styles/global.css';

applyTheme(getStoredTheme());
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CategoriesProvider>
      <DialogProvider>
        <RouterProvider router={router} />
      </DialogProvider>
    </CategoriesProvider>
  </StrictMode>,
);
