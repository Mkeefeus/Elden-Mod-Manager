import { AppShell, Burger, Button, Stack, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MantineLogo } from '@mantinex/mantine-logo';
import { Outlet, Link } from 'react-router-dom';
import { pages } from './pages/pages';
import NewsProvider from '@src/providers/NewsProvider';

const App = () => {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      header={{ height: { base: 60, md: 70, lg: 80 } }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <MantineLogo size={30} />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack mih={50} gap="md" justify="flex-start" align="stretch">
          {pages.map((page) => (
            <Link to={page.route} key={page.route}>
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
    </AppShell>
  );
};

export default App;
