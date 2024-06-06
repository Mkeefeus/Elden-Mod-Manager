import { AppShell, Button, Stack, Group, Title } from '@mantine/core';
import { Outlet, Link } from 'react-router-dom';
import { pages } from './pages/pages';
import NewsProvider from './providers/NewsProvider';
import Footer from './components/Footer';
import ModalProvider from './providers/ModalProvider';
import Modal from './components/Modal';
import './utils/rendererLogger';

const App = () => {
  // Main to Renderer events

  return (
    <AppShell
      header={{ height: { base: 60, md: 70, lg: 80 } }}
      footer={{ height: { base: 60, md: 70, lg: 80 } }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Title>Elden Mod Manager</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack mih={50} gap="md" justify="flex-start" align="stretch">
          {pages.map((page) => (
            <Link to={page.route} key={page.route} style={{ textDecoration: 'none' }}>
              <Button fullWidth variant="outline">
                {page.displayName}
              </Button>
            </Link>
          ))}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <ModalProvider>
          <NewsProvider>
            <Modal />
            <Outlet />
          </NewsProvider>
        </ModalProvider>
      </AppShell.Main>
      <AppShell.Footer>
        <Footer />
      </AppShell.Footer>
    </AppShell>
  );
};

export default App;
