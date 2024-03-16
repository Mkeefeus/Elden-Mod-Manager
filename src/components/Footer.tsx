import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { Button, Group } from '@mantine/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const Footer = () => {
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
    <>
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
    </>
  );
};

export default Footer;
