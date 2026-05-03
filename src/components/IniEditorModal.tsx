import { useEffect, useState } from 'react';
import { Button, Group, Loader, Stack, Tabs, Text, Textarea } from '@mantine/core';
import { Mod } from 'types';
import { useQuery } from '@tanstack/react-query';

interface IniEditorModalProps {
  mod: Mod;
  close: () => void;
}

const IniEditorModal = ({ mod, close }: IniEditorModalProps) => {
  const { data, isPending } = useQuery({
    queryKey: ['ini-files', mod.name],
    queryFn: async () => {
      const files = await window.electronAPI.listIniFiles(mod.name);
      const contentMap: Record<string, string> = {};
      await Promise.all(
        files.map(async (f) => {
          contentMap[f] = await window.electronAPI.readIniFile(mod.name, f);
        })
      );
      return { files, contents: contentMap };
    },
  });

  const files = data?.files ?? [];
  const [contents, setContents] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data) return;
    setContents(data.contents);
    setDirty(Object.fromEntries(data.files.map((f) => [f, false])));
  }, [data]);

  const handleChange = (filename: string, value: string) => {
    setContents((prev) => ({ ...prev, [filename]: value }));
    setDirty((prev) => ({ ...prev, [filename]: true }));
  };

  const handleSave = async (filename: string) => {
    await window.electronAPI.writeIniFile(mod.name, filename, contents[filename]);
    setDirty((prev) => ({ ...prev, [filename]: false }));
  };

  const handleSaveAll = async () => {
    await Promise.all(files.filter((f) => dirty[f]).map((f) => handleSave(f)));
  };

  if (isPending) {
    return (
      <Group justify="center" p="md">
        <Loader />
      </Group>
    );
  }

  if (files.length === 0) {
    return (
      <Stack gap="sm">
        <Text c="dimmed" ta="center" py="md">
          No INI files found in this mod&apos;s folder.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={close}>
            Close
          </Button>
        </Group>
      </Stack>
    );
  }

  const allClean = files.every((f) => !dirty[f]);

  return (
    <Stack gap="sm">
      <Tabs defaultValue={files[0]}>
        <Tabs.List>
          {files.map((f) => (
            <Tabs.Tab key={f} value={f}>
              {f}
              {dirty[f] ? ' *' : ''}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {files.map((f) => (
          <Tabs.Panel key={f} value={f} pt="sm">
            <Stack gap="xs">
              <Textarea
                value={contents[f] ?? ''}
                onChange={(e) => handleChange(f, e.currentTarget.value)}
                autosize
                minRows={12}
                maxRows={22}
                styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
              />
              <Group justify="flex-end">
                <Button
                  variant="light"
                  disabled={!dirty[f]}
                  onClick={() => {
                    void handleSave(f);
                  }}
                >
                  Save
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
      <Group justify="space-between" mt="xs">
        <Button variant="subtle" color="gray" onClick={close}>
          Close
        </Button>
        <Button
          disabled={allClean}
          onClick={() => {
            void handleSaveAll();
          }}
        >
          Save All
        </Button>
      </Group>
    </Stack>
  );
};

export default IniEditorModal;
