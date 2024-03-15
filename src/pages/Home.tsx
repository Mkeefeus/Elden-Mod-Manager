import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Group, Stack, Title } from '@mantine/core';
import NewsComponent from '@src/components/NewsComponent';

const quickActions: string[] = ['Play', 'Play Vanilla', 'Add a Mod'];

const links: { icon: IconDefinition; href: string }[] = [
  {
    icon: faGithub,
    href: 'https://www.github.com/mkeefeus/elden-mod-manager',
  },
  {
    icon: faCoffee,
    href: 'https://www.ko-fi.com',
  },
];

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
      <NewsComponent />
      <Group gap={'lg'}>
        {links.map((link) => (
          <Button
            variant="outline"
            onClick={() => {
              window.electronAPI.openExternalLink(link.href);
            }}
            key={link.href}
          >
            <FontAwesomeIcon icon={link.icon} />
          </Button>
        ))}
      </Group>
    </Stack>
  );
};

export default Home;
