import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Group, Stack, Title, Divider } from '@mantine/core';
import NewsComponent from '@src/components/NewsComponent';
import { ArticleCard } from '@src/components/ArticleCard';
import Footer from '@src/components/Footer';

const quickActions: string[] = ['Play', 'Play Vanilla', 'Add a Mod'];

const Home = () => {
  return (
    <Stack gap={'lg'}>
      <Title order={1}>Quick Actions</Title>
      <Group gap={'lg'} justify="space-between" grow>
        {quickActions.map((action, index) => (
          <Button variant="outline" key={index}>
            {action}
          </Button>
        ))}
      </Group>
      <Divider />
      {/* <ArticleCard /> */}
      <NewsComponent />
      <Footer />
    </Stack>
  );
};

export default Home;
