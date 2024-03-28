import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { Button, Group, Flex, Text, useMantineTheme, Box } from '@mantine/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const Footer = () => {
  const theme = useMantineTheme();
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
  return (
    <Box mt="auto" py="sm" w="100%">
      <Flex direction="row" justify={'space-between'} align={'flex-end'}>
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
        <Group gap={'lg'}>
          <Text size={theme.fontSizes.sm} span>
            &copy; 2024 Mkeefeus Beans Inc. All rights reserved.
          </Text>
        </Group>
      </Flex>
    </Box>
  );
};

export default Footer;
