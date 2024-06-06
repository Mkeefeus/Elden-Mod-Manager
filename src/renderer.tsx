/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter, RouteObject } from 'react-router-dom';
import App from './App';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { pages } from './pages/pages';
import { theme } from './themes';
import '@mantine/notifications/styles.css';
import { Notifications } from '@mantine/notifications';

const rootElement = document.getElementById('root') as Element;

const childRoutes: RouteObject[] = pages.map((page) => {
  return {
    path: page.route,
    element: <page.element />,
  };
});

const browserRouter = createHashRouter([
  {
    element: <App />,
    children: childRoutes,
  },
]);

if (!rootElement) {
  throw new Error('Could not find root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <Notifications />
      <RouterProvider router={browserRouter} />
    </MantineProvider>
  </StrictMode>
);
