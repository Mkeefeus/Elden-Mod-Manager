import { Accordion, Stack, Title, ScrollArea } from '@mantine/core';
import LicenseCard from '../components/LicenseCard';
import { useEffect, useState } from 'react';
import { Dependency } from 'types';
import { useElementSize } from '@mantine/hooks';

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
          throw new Error('Failed to fetch licenses');
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
      <ScrollArea type="always" mah={pageSize.height * 0.8}>
        <Accordion variant="separated">
          {Object.entries(licenses).map(([key, value]) => (
            <LicenseCard key={key} title={key} content={value} handleLinkClick={handleLinkClick} />
          ))}
        </Accordion>
      </ScrollArea>
    </Stack>
  );
};

export default About;
