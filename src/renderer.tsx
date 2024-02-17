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

import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root') as Element

const TempHome = () => {
  return (
    <div>
      <h1>Home</h1>
    </div>
  )
}

const browserRouter = createBrowserRouter([{
  element: <App />,
  children: [
    {
      path: '/',
      element: <TempHome />
    }
  ]
}])

if (!rootElement) {
  throw new Error('Could not find root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={browserRouter} />
  </StrictMode>,
)
