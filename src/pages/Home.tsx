import { Button, Group, Stack, Title, Divider } from '@mantine/core';
import NewsComponent from '../components/NewsComponent';
import { useNavigate } from 'react-router-dom';

const quickActions: string[] = ['Play', 'Play Vanilla', 'Add a Mod (Zip)', 'Add a Mod (Folder)', 'Test Error'];

const Home = () => {
  const navigate = useNavigate();

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
        case 4:
          window.electronAPI.log({
            level: 'error',
            message: 'An error occured when the test error button was pressed',
            label: 'Test error',
          });
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
    <Stack gap={'sm'}>
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
      <NewsComponent />
      {/* <Footer /> */}
    </Stack>
  );
};

export default Home;
