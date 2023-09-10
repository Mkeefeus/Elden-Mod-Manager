import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@emotion/react';
import { CssBaseline } from '@mui/material';
import theme from './theme';
import Home from './pages/Home/Home';
import Profiles from './pages/Profiles';
import Mods from './pages/Mods';
import DLLs from './pages/DLLs';
import Settings from './pages/Settings';
import About from './pages/About';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './components/App';

// Setup Paths
const router = createHashRouter([
  {
    element: <App />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: 'profiles',
        element: <Profiles />,
      },
      {
        path: 'mods',
        element: <Mods />,
      },
      {
        path: 'dlls',
        element: <DLLs />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'about',
        element: <About />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />;
    </ThemeProvider>
  </React.StrictMode>
);

postMessage({ payload: 'removeLoading' }, '*');
