import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { AddModFormValues, DownloadState } from 'types';
import { sendLog } from '../../utils/rendererLogger';
import { sleep } from '../../utils/utilities';

interface Props {
  download: DownloadState;
  onSuccess: () => void;
  onDismiss: () => void;
}

const INITIALIZER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'delay', label: 'Delay' },
  { value: 'function', label: 'Function' },
];

/** Derive a friendly mod name from the downloaded filename */
const deriveModName = (filename: string): string =>
  filename
    .replace(/\.(zip|7z|rar)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildModIdentity = (name: string, version?: string): string =>
  `${name.trim().toLowerCase()}::${(version ?? '').trim().toLowerCase()}`;

const getSuggestedModName = (download: DownloadState): string =>
  download.nexusSuggestedModName ?? deriveModName(download.filename);

const ModConfigForm = ({ download, onSuccess, onDismiss }: Props) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [installedModKeys, setInstalledModKeys] = useState<string[]>([]);
  const lastDownloadIdRef = useRef(download.id);
  const lastSuggestedModNameRef = useRef(getSuggestedModName(download));

  const form = useForm<AddModFormValues>({
    initialValues: {
      modName: getSuggestedModName(download),
      isDll: false,
      path: download.extractedPath ?? '',
      delete: false,
      hasExe: false,
      exePath: '',
      dllPath: '',
      loadEarly: false,
      optional: false,
      finalizer: '',
      initializerType: 'none',
      initializerDelayMs: 0,
      initializerFunction: '',
      modVersion: download.nexusVersion,
      nexusModId: download.nexusModId,
      nexusFileId: download.nexusFileId,
      nexusGameDomain: download.nexusGameDomain,
    },
    validate: {
      modName: (v, values) => {
        if (!v.trim()) return 'Mod name is required';
        if (installedModKeys.includes(buildModIdentity(v, values.modVersion))) {
          return 'Mod name and version are already in use';
        }
        return null;
      },
      path: isNotEmpty('Path is required'),
      dllPath: (v, values) => (values.isDll && !v ? 'DLL file is required' : null),
      exePath: (v, values) => (values.hasExe && !v ? 'Executable is required' : null),
    },
  });

  useEffect(() => {
    const suggestedModName = getSuggestedModName(download);

    if (download.id !== lastDownloadIdRef.current) {
      form.setFieldValue('modName', suggestedModName);
      lastDownloadIdRef.current = download.id;
      lastSuggestedModNameRef.current = suggestedModName;
      return;
    }

    if (form.values.modName.trim() === lastSuggestedModNameRef.current.trim()) {
      form.setFieldValue('modName', suggestedModName);
    }

    lastSuggestedModNameRef.current = suggestedModName;
  }, [download.id, download.filename, download.nexusSuggestedModName]);

  useEffect(() => {
    form.setFieldValue('path', download.extractedPath ?? '');
    form.setFieldValue('modVersion', download.nexusVersion);
    form.setFieldValue('nexusModId', download.nexusModId);
    form.setFieldValue('nexusFileId', download.nexusFileId);
    form.setFieldValue('nexusGameDomain', download.nexusGameDomain);
  }, [
    download.extractedPath,
    download.nexusVersion,
    download.nexusModId,
    download.nexusFileId,
    download.nexusGameDomain,
  ]);

  // Load names in use and auto-scan for dll/exe
  useEffect(() => {
    window.electronAPI
      .loadMods()
      .then((mods) => setInstalledModKeys(mods.map((m) => buildModIdentity(m.name, m.version))))
      .catch(console.error);

    if (download.extractedPath) {
      Promise.all([
        window.electronAPI.scanDir(download.extractedPath, 'dll'),
        window.electronAPI.scanDir(download.extractedPath, 'exe'),
      ])
        .then(([dll, exe]) => {
          if (dll && !exe) {
            form.setFieldValue('isDll', true);
            form.setFieldValue('dllPath', dll);
          }
          if (exe) {
            form.setFieldValue('hasExe', true);
            form.setFieldValue('exePath', exe);
          }
        })
        .catch(console.error);
    }
  }, [download.id]);

  const handleSubmit = async (values: AddModFormValues) => {
    values.modName = values.modName.trim();
    setSubmitting(true);
    try {
      const success = await window.electronAPI.addMod(values);
      if (!success) {
        notifications.show({
          title: 'Failed to add mod',
          message: 'The mod could not be validated. Check that the path contains a valid mod structure.',
          color: 'red',
        });
        setSubmitting(false);
        return;
      }
      await sleep(500);
      sendLog({ level: 'info', message: `Mod "${values.modName}" added successfully`, hideDisplay: true });
      notifications.show({
        title: 'Mod added',
        message: `"${values.modName}" is now in your mod list.`,
        color: 'green',
      });
      onSuccess();
    } catch (err) {
      notifications.show({ title: 'Error', message: String(err), color: 'red' });
      setSubmitting(false);
    }
  };

  if (download.status === 'error') {
    return (
      <Box p="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Download Failed" color="red" mb="md">
          {download.error ?? 'An unknown error occurred.'}
        </Alert>
        <Button variant="outline" onClick={onDismiss}>
          Dismiss
        </Button>
      </Box>
    );
  }

  if (download.status === 'downloading' || download.status === 'extracting') {
    return (
      <Box p="xl">
        <Stack gap="sm" align="flex-start">
          <Title order={4}>{download.filename}</Title>
          <Text c="dimmed">
            {download.status === 'downloading' ? `Downloading… ${download.progress}%` : 'Extracting…'}
          </Text>
          <Button
            variant="outline"
            color="red"
            size="xs"
            onClick={() => window.electronAPI.cancelDownload(download.id)}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <ScrollArea h="100%" p="xl">
      <Box maw={640} p="xl">
        <Title order={4} mb="xs">
          Configure Mod
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          {download.filename}
        </Text>

        <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
          <Stack gap="sm">
            <TextInput label="Mod Name" withAsterisk {...form.getInputProps('modName')} />

            {download.source === 'local' && <TextInput label="Mod Path" readOnly {...form.getInputProps('path')} />}

            <Checkbox
              label="Is Native (has DLL)?"
              {...form.getInputProps('isDll', { type: 'checkbox' })}
              onChange={(e) => {
                form.setFieldValue('isDll', e.currentTarget.checked);
                if (e.currentTarget.checked && form.values.path) {
                  void window.electronAPI.scanDir(form.values.path, 'dll').then((found) => {
                    if (found) form.setFieldValue('dllPath', found);
                  });
                }
              }}
            />

            {form.values.isDll && (
              <Group align="flex-end">
                <TextInput withAsterisk label="DLL file" {...form.getInputProps('dllPath')} style={{ flex: 4 }} />
                <Button
                  style={{ flex: 1 }}
                  onClick={() => {
                    void window.electronAPI.browse('dll', 'Select mod DLL', form.values.path).then((p) => {
                      if (p) form.setFieldValue('dllPath', p.split(/[/\\]/).pop() ?? p);
                    });
                  }}
                >
                  Browse
                </Button>
              </Group>
            )}

            <Checkbox
              label="Has application?"
              {...form.getInputProps('hasExe', { type: 'checkbox' })}
              onChange={(e) => {
                form.setFieldValue('hasExe', e.currentTarget.checked);
                if (e.currentTarget.checked && form.values.path) {
                  void window.electronAPI.scanDir(form.values.path, 'exe').then((found) => {
                    if (found) form.setFieldValue('exePath', found);
                  });
                }
              }}
            />

            {form.values.hasExe && (
              <Group align="flex-end">
                <TextInput
                  withAsterisk
                  label="Executable file"
                  {...form.getInputProps('exePath')}
                  style={{ flex: 4 }}
                />
                <Button
                  style={{ flex: 1 }}
                  onClick={() => {
                    void window.electronAPI.browse('exe', 'Select mod executable', form.values.path).then((p) => {
                      if (p) form.setFieldValue('exePath', p.split(/[/\\]/).pop() ?? p);
                    });
                  }}
                >
                  Browse
                </Button>
              </Group>
            )}

            <Checkbox label="Delete source after import?" {...form.getInputProps('delete', { type: 'checkbox' })} />

            {form.values.isDll && (
              <>
                <Button variant="subtle" size="compact-sm" onClick={() => setShowAdvanced((v) => !v)}>
                  {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
                </Button>
                <Collapse expanded={showAdvanced}>
                  <Stack gap="sm" mt="xs">
                    <Checkbox
                      label="Load early"
                      description="Load this DLL before the game has fully initialized"
                      {...form.getInputProps('loadEarly', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Optional"
                      description="If unchecked, failure to load this DLL is treated as a critical error"
                      {...form.getInputProps('optional', { type: 'checkbox' })}
                    />
                    <TextInput
                      label="Finalizer"
                      description="Symbol name called when this DLL is queued for unload"
                      placeholder="e.g. on_unload"
                      {...form.getInputProps('finalizer')}
                    />
                    <Select label="Initializer" data={INITIALIZER_OPTIONS} {...form.getInputProps('initializerType')} />
                    {form.values.initializerType === 'delay' && (
                      <NumberInput label="Delay (ms)" min={0} {...form.getInputProps('initializerDelayMs')} />
                    )}
                    {form.values.initializerType === 'function' && (
                      <TextInput
                        label="Initializer function"
                        placeholder="e.g. on_init"
                        {...form.getInputProps('initializerFunction')}
                      />
                    )}
                  </Stack>
                </Collapse>
              </>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="dimmed" onClick={onDismiss}>
                Dismiss
              </Button>
              <Button type="submit" loading={submitting}>
                Add Mod
              </Button>
            </Group>
          </Stack>
        </form>
      </Box>
    </ScrollArea>
  );
};

export default ModConfigForm;
