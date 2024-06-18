import { Accordion, Stack, Title, ScrollArea } from '@mantine/core';
import LicenseCard from '../components/LicenseCard';
import { useEffect, useState } from 'react';
import { Dependency } from 'types';
import { useElementSize } from '@mantine/hooks';
import { sendLog } from '../utils/rendererLogger';

interface DependenciesData {
  [key: string]: Dependency;
}

const About = () => {
  const [licenses, setLicenses] = useState<DependenciesData>({});

  const pageSize = useElementSize();

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        const response = await fetch('./licenses.json');
        if (!response.ok) {
          const msg = 'Failed to fetch licenses with status: ' + response.status;
          sendLog({
            level: 'error',
            message: msg,
          });
          throw new Error(msg);
        }
        const data = (await response.json()) as DependenciesData;
        setLicenses(data);
      } catch (error) {
        console.error('Error fetching licenses:', error);
      }
    };

    fetchLicenses();
  }, []);

  const handleLinkClick = (url: string) => {
    window.electronAPI.openExternalLink(url);
  };

  return (
    <Stack flex={1} ref={pageSize.ref}>
      <Title ta="center">Licenses</Title>
      <ScrollArea.Autosize type="always" mah={pageSize.height * 0.8}>
        <Accordion variant="separated">
          {Object.entries(licenses).map(([key, value]) => (
            <LicenseCard key={key} title={key} content={value} handleLinkClick={handleLinkClick} />
          ))}
        </Accordion>
      </ScrollArea.Autosize>
    </Stack>
  );
};

export default About;
