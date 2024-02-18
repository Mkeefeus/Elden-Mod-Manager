import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Flex, Title } from '@mantine/core';

const quickActions: { label: string; flex: number }[] = [
  {
    label: 'Play',
    flex: 1,
  },
  {
    label: 'Play Vanilla',
    flex: 1,
  },
  {
    label: 'Add a Mod',
    flex: 1,
  },
];

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
    <Flex direction={'column'} gap={'lg'}>
      <Title order={1}>Quick Actions</Title>
      <Flex gap={'lg'}>
        {quickActions.map((action, index) => (
          <Button variant="outline" style={{ flex: action.flex }} key={index}>
            {action.label}
          </Button>
        ))}
      </Flex>
      <Title order={2}>News or updates or something idk</Title>
      Maybe I can pull the latest patch notes or somethin here
      <Title order={2}>Links</Title>
      <Flex gap={'lg'}>
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
      </Flex>
    </Flex>
  );
};

export default Home;
