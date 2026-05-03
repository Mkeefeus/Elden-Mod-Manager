import {
  Box,
  NavLink,
  Progress,
  Stack,
  Text,
  ActionIcon,
  Group,
  Badge,
  ScrollArea,
  Divider,
  Title,
} from '@mantine/core';
import {
  IconWorld,
  IconFileZip,
  IconFolder,
  IconDownload,
  IconCircleCheck,
  IconAlertCircle,
  IconLoader2,
  IconX,
} from '@tabler/icons-react';
import { DownloadState } from 'types';
import { ActiveTab } from '../../pages/GetMods';

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  downloads: DownloadState[];
  onDismiss: (id: string) => void;
}

const StatusIcon = ({ status }: { status: DownloadState['status'] }) => {
  switch (status) {
    case 'downloading':
      return <IconDownload size={14} />;
    case 'extracting':
      return <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />;
    case 'ready':
      return <IconCircleCheck size={14} color="var(--mantine-color-green-5)" />;
    case 'error':
      return <IconAlertCircle size={14} color="var(--mantine-color-red-5)" />;
  }
};

const StatusBadge = ({ status }: { status: DownloadState['status'] }) => {
  const map: Record<DownloadState['status'], { label: string; color: string }> = {
    downloading: { label: 'Downloading', color: 'blue' },
    extracting: { label: 'Extracting', color: 'yellow' },
    ready: { label: 'Ready to Install', color: 'green' },
    error: { label: 'Error', color: 'red' },
  };
  const { label, color } = map[status];
  return (
    <Badge size="xs" color={color} variant="light">
      {label}
    </Badge>
  );
};

const GetModsSidebar = ({ activeTab, onTabChange, downloads, onDismiss }: Props) => {
  return (
    <Stack gap={0} h="100%">
      {/* Header */}
      <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gold-7)' }}>
        <Title order={5} style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>
          Get Mods
        </Title>
      </Box>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={4} p="xs">
          {/* Fixed tabs */}
          <NavLink
            label="Nexus Mods"
            leftSection={<IconWorld size={16} />}
            active={activeTab === 'nexus'}
            onClick={() => onTabChange('nexus')}
            variant="filled"
            style={{ borderRadius: 'var(--mantine-radius-sm)' }}
          />
          <NavLink
            label="Add from Archive"
            leftSection={<IconFileZip size={16} />}
            active={activeTab === 'add-archive'}
            onClick={() => onTabChange('add-archive')}
            variant="filled"
            style={{ borderRadius: 'var(--mantine-radius-sm)' }}
          />
          <NavLink
            label="Add from Folder"
            leftSection={<IconFolder size={16} />}
            active={activeTab === 'add-folder'}
            onClick={() => onTabChange('add-folder')}
            variant="filled"
            style={{ borderRadius: 'var(--mantine-radius-sm)' }}
          />

          {/* Download queue */}
          {downloads.length > 0 && (
            <>
              <Divider my="xs" label="Downloads" labelPosition="left" />
              {downloads.map((dl) => (
                <Box
                  key={dl.id}
                  style={{
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: activeTab === dl.id ? '1px solid var(--mantine-color-gold-5)' : '1px solid transparent',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    background: activeTab === dl.id ? 'var(--mantine-color-dark-6)' : 'transparent',
                  }}
                  onClick={() => onTabChange(dl.id)}
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <StatusIcon status={dl.status} />
                      <Text size="xs" truncate style={{ maxWidth: 140 }}>
                        {dl.filename}
                      </Text>
                    </Group>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="dimmed"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(dl.id);
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>

                  {(dl.status === 'downloading' || dl.status === 'extracting') && (
                    <Progress
                      value={dl.status === 'extracting' ? 100 : dl.progress}
                      size="xs"
                      mt={4}
                      animated={dl.status === 'extracting'}
                      color={dl.status === 'extracting' ? 'yellow' : 'blue'}
                    />
                  )}

                  <Box mt={4}>
                    <StatusBadge status={dl.status} />
                  </Box>
                </Box>
              ))}
            </>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};

export default GetModsSidebar;
