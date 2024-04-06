import { Button, Group, Stack, Title, Divider } from '@mantine/core';
import NewsComponent from '@src/components/NewsComponent';
import { useNavigate } from 'react-router-dom';

const quickActions: string[] = ['Play', 'Play Vanilla', 'Add a Mod (Zip)', 'Add a Mod (Folder)'];

const Home = () => {
  const navigate = useNavigate();

  const handleQuckAction = (index: number) => {
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
