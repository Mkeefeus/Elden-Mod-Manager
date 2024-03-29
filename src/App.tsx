import { AppShell, Burger, Button, Stack, Group, Title, Avatar, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, Link } from 'react-router-dom';
import { pages } from './pages/pages';
import NewsProvider from '@src/providers/NewsProvider';
import Footer from './components/Footer';

const App = () => {
  const [opened, { toggle }] = useDisclosure();
  const theme = useMantineTheme();

  return (
    <AppShell
      header={{ height: { base: 60, md: 70, lg: 80 } }}
      footer={{ height: { base: 60, md: 70, lg: 80 } }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      c={theme.colors.orange[4]}
      color={theme.colors.dark[8]}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Avatar src="/avatar2.png" size={60} radius="sm" mr={0} />
          <Title order={1}>Elden Mod Manager</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack mih={50} gap="md" justify="flex-start" align="stretch">
          {pages.map((page) => (
            <Link to={page.route} key={page.route} style={{ color: 'inherit', textDecoration: 'none' }}>
              <Button fullWidth variant="outline">
                {page.displayName}
              </Button>
            </Link>
          ))}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <NewsProvider>
          <Outlet />
        </NewsProvider>
      </AppShell.Main>
      <AppShell.Footer>
        <Footer />
      </AppShell.Footer>
    </AppShell>
  );
};

export default App;
