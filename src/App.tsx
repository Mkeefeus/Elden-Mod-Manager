import { AppShell, Group, NavLink, Title } from '@mantine/core';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { pages } from './pages/pages';
import Footer from './components/Footer';
import ModalProvider from './providers/ModalProvider';
import ModsProvider from './providers/ModsProvider';
import Modal from './components/Modal';
import './utils/rendererLogger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IconHome2, IconPuzzle, IconSettings, IconInfoCircle } from '@tabler/icons-react';

const pageIcons: Record<string, React.ReactNode> = {
  '/': <IconHome2 size={18} />,
  '/mods': <IconPuzzle size={18} />,
  '/settings': <IconSettings size={18} />,
  '/about': <IconInfoCircle size={18} />,
};

const AppNavbar = () => {
  const location = useLocation();
  return (
    <>
      {pages.map((page) => (
        <NavLink
          key={page.route}
          component={Link}
          to={page.route}
          label={page.displayName}
          leftSection={pageIcons[page.route]}
          active={location.pathname === page.route}
          variant="filled"
          style={{ borderRadius: 'var(--mantine-radius-sm)' }}
        />
      ))}
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

void queryClient.prefetchQuery({
  queryKey: ['licenses'],
  queryFn: () => fetch('./licenses.json').then((r) => r.json()),
  staleTime: Infinity,
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell
        header={{ height: { base: 60, md: 70, lg: 80 } }}
        footer={{ height: { base: 60, md: 70, lg: 80 } }}
        navbar={{
          width: 250,
          breakpoint: 'sm',
        }}
      >
        <AppShell.Header
          style={{
            borderBottom: '1px solid var(--mantine-color-gold-7)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Group h="100%" px="md">
            <Title
              style={{
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontSize: 'clamp(1rem, 2vw, 1.4rem)',
              }}
            >
              Elden Mod Manager
            </Title>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <AppNavbar />
        </AppShell.Navbar>
        <AppShell.Main display={'flex'} style={{ flexDirection: 'column' }}>
          <ModsProvider>
            <ModalProvider>
              <Modal />
              <Outlet />
            </ModalProvider>
          </ModsProvider>
        </AppShell.Main>
        <AppShell.Footer>
          <Footer />
        </AppShell.Footer>
      </AppShell>
    </QueryClientProvider>
  );
};

export default App;
