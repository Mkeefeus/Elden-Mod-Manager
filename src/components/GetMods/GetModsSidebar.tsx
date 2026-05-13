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
  Tooltip,
  Menu,
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
  IconPackageImport,
  IconChevronDown,
} from '@tabler/icons-react';
import { DownloadState, ImportModResult } from 'types';
import { ActiveTab } from '../../pages/GetMods';

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  downloads: DownloadState[];
  onDismiss: (id: string) => void;
  importQueue?: ImportModResult[];
  onImportInstallAction?: (mod: ImportModResult, method: 'nexus' | 'add-archive' | 'add-folder') => void;
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

const GetModsSidebar = ({
  activeTab,
  onTabChange,
  downloads,
  onDismiss,
  importQueue,
  onImportInstallAction,
}: Props) => {
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

          {/* Import queue */}
          {importQueue && importQueue.length > 0 && (
            <>
              <Divider
                my="xs"
                label={
                  <Group gap={4}>
                    <IconPackageImport size={12} />
                    <Text size="xs">Pending Installs</Text>
                    {importQueue.some((m) => m.status !== 'installed') ? (
                      <Badge size="xs" color="yellow" variant="light">
                        {importQueue.filter((m) => m.status !== 'installed').length} left
                      </Badge>
                    ) : (
                      <Badge size="xs" color="green" variant="light">
                        All installed
                      </Badge>
                    )}
                  </Group>
                }
                labelPosition="left"
              />
              {importQueue.map((mod, i) => {
                const isPending = mod.status !== 'installed';
                const hasNexus = !!mod.nexusModId;

                if (!isPending) {
                  return (
                    <Tooltip key={i} label="Installed" position="right" withArrow>
                      <Box
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                          border: '1px solid var(--mantine-color-green-9)',
                          padding: '6px 8px',
                          opacity: 0.6,
                        }}
                      >
                        <Group gap="xs" wrap="nowrap">
                          <IconCircleCheck size={14} color="var(--mantine-color-green-5)" />
                          <Text size="xs" truncate style={{ flex: 1 }}>
                            {mod.name}
                          </Text>
                        </Group>
                      </Box>
                    </Tooltip>
                  );
                }

                return (
                  <Menu key={i} position="right-start" withArrow offset={4}>
                    <Menu.Target>
                      <Box
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                          border: '1px solid var(--mantine-color-dark-4)',
                          cursor: 'pointer',
                          padding: '6px 8px',
                        }}
                      >
                        <Group gap="xs" wrap="nowrap">
                          <IconAlertCircle size={14} color="var(--mantine-color-yellow-5)" />
                          <Text size="xs" truncate style={{ flex: 1 }}>
                            {mod.name}
                          </Text>
                          <IconChevronDown size={10} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                        </Group>
                      </Box>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Install via...</Menu.Label>
                      {hasNexus && (
                        <Menu.Item
                          leftSection={<IconWorld size={14} />}
                          onClick={() => onImportInstallAction?.(mod, 'nexus')}
                        >
                          Nexus Mods
                        </Menu.Item>
                      )}
                      <Menu.Item
                        leftSection={<IconFileZip size={14} />}
                        onClick={() => onImportInstallAction?.(mod, 'add-archive')}
                      >
                        Archive
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconFolder size={14} />}
                        onClick={() => onImportInstallAction?.(mod, 'add-folder')}
                      >
                        Folder
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                );
              })}
            </>
          )}

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
