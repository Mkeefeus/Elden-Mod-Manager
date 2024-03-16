import { Button, Group, Stack, Title, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import NewsComponent from '@src/components/NewsComponent';
import Footer from '@src/components/Footer';
import { useNavigate } from 'react-router-dom';

const quickActions: string[] = ['Play', 'Play Vanilla', 'Add a Mod (Zip)'];

const Home = () => {
  const navigate = useNavigate();

  const handleAddModClick = () => {
    navigate('/mods', { state: { fromZip: true, opened: true } });
  };
  return (
    <Stack gap={'lg'}>
      <Title order={1}>Quick Actions</Title>
      <Group gap={'lg'} justify="space-between" grow>
        {quickActions.map((action, index) => (
          <Button
            variant="outline"
            key={index}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.innerText === quickActions[2] ? handleAddModClick() : null;
            }}
          >
            {action}
          </Button>
        ))}
      </Group>
      <Divider />
      <NewsComponent />
      <Footer />
    </Stack>
  );
};

export default Home;
