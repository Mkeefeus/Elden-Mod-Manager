import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { Button, Group, Text } from '@mantine/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { IconArrowUpCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useModal } from '@providers/ModalProvider';
import UpdateAvailableModal from './UpdateAvailableModal';

const Footer = () => {
  const { showModal } = useModal();
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
      <style>
        {`
          @keyframes update-notification-pulse {
            0%, 100% {
              box-shadow: 0 0 0 0 var(--mantine-color-blue-6, #228be6);
            }
            50% {
              box-shadow: 0 0 0 6px transparent;
            }
          }
          .update-notification-pulse {
            animation: update-notification-pulse 4s ease-in-out infinite;
          }
        `}
      </style>
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
          className="update-notification-pulse"
          leftSection={<IconArrowUpCircle size={16} />}
          onClick={() => {
            void (async () => {
              const ready = await window.electronAPI.isUpdateReady();
              if (ready) {
                showModal({
                  title: 'Update Available',
                  content: <UpdateAvailableModal version={update.version} url={update.url} />,
                  size: 'sm',
                });
              } else {
                window.electronAPI.openExternalLink(update.url);
              }
            })();
          }}
          title={`v${update.version} is available — click to update`}
        >
          v{update.version} available
        </Button>
      )}
      <Text size={'sm'} span>
        &copy; 2026 Malcolm Keefe. Licensed under AGPLv3
      </Text>
    </Group>
  );
};

export default Footer;
