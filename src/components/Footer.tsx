import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { Button, Group, Text } from '@mantine/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { IconArrowUpCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

const Footer = () => {
  const { data: update } = useQuery({
    queryKey: ['latest-release'],
    queryFn: () => window.electronAPI.getLatestVersion(),
    staleTime: Infinity,
    retry: false,
  });

  const links: { icon: IconDefinition; href: string }[] = [
    {
      icon: faGithub,
      href: 'https://www.github.com/mkeefeus/elden-mod-manager',
    },
    {
      icon: faCoffee,
      href: 'https://www.ko-fi.com/mkeefeus',
    },
  ];
  return (
    <Group justify="space-between" px={'md'} style={{ height: '100%' }}>
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
      {update && (
        <Button
          variant="outline"
          leftSection={<IconArrowUpCircle size={16} />}
          onClick={() => window.electronAPI.openExternalLink(update.url)}
          title={`v${update.version} is available — click to open release notes`}
        >
          v{update.version} available
        </Button>
      )}
      <Text size={'sm'} span>
        &copy; 2024 Malcolm Keefe. Licensed under AGPLv3
      </Text>
    </Group>
  );
};

export default Footer;
