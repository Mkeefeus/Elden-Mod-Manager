import { Button, Group, Stack, Title, Divider, useMantineTheme, Container, ScrollArea, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useNews } from '../providers/NewsProvider';
import NewsCard from '../components/NewsCard';
import { useElementSize } from '@mantine/hooks';

const quickActions: string[] = ['Play', 'Play Vanilla', 'Add a Mod (Zip)', 'Add a Mod (Folder)'];

const Home = () => {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const { news } = useNews();
  const pageSize = useElementSize();
  const contentSize = useElementSize();

  const handleQuckAction = (index: number) => {
    try {
      switch (index) {
        case 0:
          window.electronAPI.launchGame(true);
          break;
        case 1:
          window.electronAPI.launchGame(false);
          break;
        case 2:
          navigate('/mods', { state: { fromZip: true, opened: true } });
          break;
        case 3:
          navigate('/mods', { state: { fromZip: false, opened: true } });
          break;
      }
    } catch (error) {
      window.electronAPI.log({
        level: 'error',
        message: error instanceof Error ? error.message : (error as string),
        label: 'Quick Action Error',
      });
    }
  };

  return (
    <Stack gap={'sm'} flex={'1 0 0'} ref={pageSize.ref}>
      <Stack ref={contentSize.ref}>
        <Title order={2}>Quick Actions</Title>
        <Group gap={'lg'} justify="space-between" grow>
          {quickActions.map((action, index) => (
            <Button
              variant="light"
              key={index}
              onClick={() => {
                handleQuckAction(index);
              }}
            >
              {action}
            </Button>
          ))}
        </Group>
        <Divider />
        <Title order={4} my={1} m={0} p={0} fs="italic">
          Recent News
        </Title>
        {!news && (
          <Container fluid pl={5}>
            <Text size={theme.fontSizes.md} style={{ marginRight: 'auto' }}>
              Loading...
            </Text>
          </Container>
        )}
      </Stack>
      <ScrollArea.Autosize mah={(pageSize.height - contentSize.height) * 0.9}>
        <Stack gap={'xs'}>
          {news.map((article, index) => {
            return <NewsCard key={index} article={article} />;
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
};

export default Home;
