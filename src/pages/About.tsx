import { Loader, Paper, Stack, Text, TextInput, Title, UnstyledButton } from '@mantine/core';
import { Dependency } from 'types';
import { sendLog } from '../utils/rendererLogger';
import { version } from '../../package.json';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useElementSize } from '@mantine/hooks';

interface DependenciesData {
  [key: string]: Dependency;
}

const LINK_STYLES: React.CSSProperties = { textDecoration: 'underline', cursor: 'pointer' };

interface LicenseItemProps {
  title: string;
  content: Dependency;
  isOpen: boolean;
  onToggle: () => void;
  handleLinkClick: (url: string) => void;
}

const LicenseItem = ({ title, content, isOpen, onToggle, handleLinkClick }: LicenseItemProps) => (
  <Paper withBorder mb={8}>
    <UnstyledButton w="100%" p="sm" onClick={onToggle} style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Text fw={500}>{title}</Text>
      <Text c="dimmed">{isOpen ? '▲' : '▼'}</Text>
    </UnstyledButton>
    {isOpen && (
      <Stack p="sm" pt={0} gap="xs">
        <Text>
          <Text span fw={500}>
            License:{' '}
          </Text>
          {content.licenses}
        </Text>
        <Text>
          <Text span fw={500}>
            License URL:{' '}
          </Text>
          <Text span onClick={() => handleLinkClick(content.licenseUrl)} style={LINK_STYLES}>
            {content.licenseUrl}
          </Text>
        </Text>
        <Text>
          <Text span fw={500}>
            Repository:{' '}
          </Text>
          <Text span onClick={() => handleLinkClick(content.repository)} style={LINK_STYLES}>
            {content.repository}
          </Text>
        </Text>
      </Stack>
    )}
  </Paper>
);

const HEADER_HEIGHT = 160; // title + search + version + gaps

const About = () => {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: pageRef, height: pageHeight } = useElementSize();

  const { data: licenses = {}, isPending } = useQuery({
    queryKey: ['licenses'],
    queryFn: async () => {
      const response = await fetch('./licenses.json');
      if (!response.ok) {
        const msg = 'Failed to fetch licenses with status: ' + response.status;
        sendLog({ level: 'error', message: msg });
        throw new Error(msg);
      }
      return response.json() as Promise<DependenciesData>;
    },
    staleTime: Infinity,
  });

  const entries = search
    ? Object.entries(licenses).filter(([key]) => key.toLowerCase().includes(search.toLowerCase()))
    : Object.entries(licenses);

  const scrollHeight = pageHeight > HEADER_HEIGHT ? pageHeight - HEADER_HEIGHT : 400;

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 58,
    overscan: 5,
  });

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLinkClick = (url: string) => {
    window.electronAPI.openExternalLink(url);
  };

  return (
    <Stack ref={pageRef} flex={1}>
      <Title ta="center">Licenses</Title>
      <TextInput placeholder="Search packages..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
      {isPending ? (
        <Stack style={{ height: scrollHeight }} align="center" justify="center">
          <Loader />
        </Stack>
      ) : (
        <div
          ref={scrollRef}
          style={{
            height: scrollHeight,
            overflowY: 'auto',
            padding: '4px 4px 0',
          }}
        >
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const [key, value] = entries[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <LicenseItem
                    title={key}
                    content={value}
                    isOpen={openItems.has(key)}
                    onToggle={() => toggleItem(key)}
                    handleLinkClick={handleLinkClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Text>{`Version ${version}`}</Text>
    </Stack>
  );
};

export default About;
