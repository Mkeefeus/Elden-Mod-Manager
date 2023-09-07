import { useState } from 'react';
import {
  Link,
  createHashRouter,
  RouterProvider,
  Outlet,
} from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Container, Stack } from '@mui/material';
import Home from './pages/Home/Home';
import Profiles from './pages/Profiles';
import Mods from './pages/Mods';
import DLLs from './pages/DLLs';
import Settings from './pages/Settings';
import About from './pages/About';

import Background from './Background';

// Setup Paths
const router = createHashRouter([
  {
    element: <NavBar />,
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

// Create Router
export default function App() {
  return <RouterProvider router={router} />;
}

// Components
function NavBar() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh' }}>
      <Stack direction="row" spacing={2}>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          orientation="vertical"
          sx={{ flexShrink: 0 }}
        >
          <Tab label="Home" component={Link} to="/" />
          <Tab label="Profiles" component={Link} to="profiles" />
          <Tab label="Mods" component={Link} to="mods" />
          <Tab label="DLLs" component={Link} to="dlls" />
          <Tab label="Settings" component={Link} to="settings" />
          <Tab label="About" component={Link} to="about" />
        </Tabs>

        <Background>
          <Outlet />
        </Background>
      </Stack>
    </Container>
  );
}
