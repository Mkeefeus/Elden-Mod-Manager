import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { AddModFormValues, DownloadState, NativeInitializerCondition } from 'types';
import { sendLog } from '../../utils/rendererLogger';
import { sleep } from '../../utils/utilities';

interface Props {
  download: DownloadState;
  onSuccess: () => void;
  onDismiss: () => void;
}

type InitializerType = 'none' | 'delay' | 'function';

type ModConfigFormValues = AddModFormValues & {
  finalizer: string;
  initializerType: InitializerType;
  initializerDelayMs: number;
  initializerFunction: string;
};

const INITIALIZER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'delay', label: 'Delay' },
  { value: 'function', label: 'Function' },
];

const formValuesToInitializer = (values: ModConfigFormValues): NativeInitializerCondition | undefined => {
  if (values.initializerType === 'delay') return { delay: { ms: values.initializerDelayMs } };
  if (values.initializerType === 'function') return { function: values.initializerFunction };
  return undefined;
};

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
  download.importTarget?.name ?? download.nexusSuggestedModName ?? deriveModName(download.filename);

const getSuggestedModVersion = (download: DownloadState): string | undefined =>
  download.importTarget?.version ?? download.nexusVersion;

const getSuggestedNexusModId = (download: DownloadState): number | undefined =>
  download.importTarget?.nexusModId ?? download.nexusModId;

const getSuggestedNexusFileId = (download: DownloadState): number | undefined =>
  download.importTarget?.nexusFileId ?? download.nexusFileId;

const getSuggestedNexusGameDomain = (download: DownloadState): string | undefined =>
  download.importTarget?.nexusGameDomain ?? download.nexusGameDomain;

const ModConfigForm = ({ download, onSuccess, onDismiss }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [installedModKeys, setInstalledModKeys] = useState<string[]>([]);
  const [showAdvancedNativeSettings, setShowAdvancedNativeSettings] = useState(false);
  const lastDownloadIdRef = useRef(download.id);
  const lastSuggestedModNameRef = useRef(getSuggestedModName(download));

  const form = useForm<ModConfigFormValues>({
    initialValues: {
      modName: getSuggestedModName(download),
      isDll: false,
      path: download.extractedPath ?? '',
      delete: false,
      hasExe: false,
      exePath: '',
      dllPath: '',
      loadEarly: false,
      finalizer: '',
      initializerType: 'none',
      initializerDelayMs: 0,
      initializerFunction: '',
      modVersion: getSuggestedModVersion(download),
      nexusModId: getSuggestedNexusModId(download),
      nexusFileId: getSuggestedNexusFileId(download),
      nexusGameDomain: getSuggestedNexusGameDomain(download),
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
  }, [download.id, download.filename, download.importTarget?.name, download.nexusSuggestedModName]);

  useEffect(() => {
    form.setFieldValue('path', download.extractedPath ?? '');
    form.setFieldValue('modVersion', getSuggestedModVersion(download));
    form.setFieldValue('nexusModId', getSuggestedNexusModId(download));
    form.setFieldValue('nexusFileId', getSuggestedNexusFileId(download));
    form.setFieldValue('nexusGameDomain', getSuggestedNexusGameDomain(download));
  }, [
    download.extractedPath,
    download.importTarget?.version,
    download.importTarget?.nexusModId,
    download.importTarget?.nexusFileId,
    download.importTarget?.nexusGameDomain,
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
  }, [download.id, download.extractedPath]);

  const handleSubmit = async (values: ModConfigFormValues) => {
    const payload: AddModFormValues = {
      modName: values.modName.trim(),
      isDll: values.isDll,
      path: values.path,
      delete: values.delete,
      hasExe: values.hasExe,
      exePath: values.exePath,
      dllPath: values.dllPath,
      loadEarly: values.loadEarly,
      finalizer: values.finalizer.trim() || undefined,
      initializer: formValuesToInitializer(values),
      modVersion: values.modVersion,
      nexusModId: values.nexusModId,
      nexusFileId: values.nexusFileId,
      nexusGameDomain: values.nexusGameDomain,
    };

    setSubmitting(true);
    try {
      const success = await window.electronAPI.addMod(payload);
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
      sendLog({ level: 'info', message: `Mod "${payload.modName}" added successfully`, hideDisplay: true });
      notifications.show({
        title: 'Mod added',
        message: `"${payload.modName}" is now in your mod list.`,
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

        {download.importTarget && (
          <Text size="sm" c="yellow.2" mb="lg">
            Pending import target: {download.importTarget.name}
            {download.importTarget.version ? ` (${download.importTarget.version})` : ''}
          </Text>
        )}

        <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
          <Stack gap="sm">
            <TextInput label="Mod Name" withAsterisk {...form.getInputProps('modName')} />

            <TextInput label="Version" placeholder="e.g. 1.0.0" {...form.getInputProps('modVersion')} />

            {download.source === 'local' && <TextInput label="Mod Path" readOnly {...form.getInputProps('path')} />}

            <Checkbox
              label="Is Native (has DLL)?"
              {...form.getInputProps('isDll', { type: 'checkbox' })}
              onChange={(e) => {
                form.setFieldValue('isDll', e.currentTarget.checked);
                if (!e.currentTarget.checked) {
                  form.setFieldValue('loadEarly', false);
                  form.setFieldValue('finalizer', '');
                  form.setFieldValue('initializerType', 'none');
                  form.setFieldValue('initializerDelayMs', 0);
                  form.setFieldValue('initializerFunction', '');
                  setShowAdvancedNativeSettings(false);
                }
                if (e.currentTarget.checked && form.values.path) {
                  void window.electronAPI.scanDir(form.values.path, 'dll').then((found) => {
                    if (found) form.setFieldValue('dllPath', found);
                  });
                }
              }}
            />

            {form.values.isDll && (
              <>
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
                <Checkbox
                  label="Load early"
                  description="Load this DLL before the game has fully initialized"
                  {...form.getInputProps('loadEarly', { type: 'checkbox' })}
                />
                <Button
                  type="button"
                  variant="default"
                  size="xs"
                  onClick={() => setShowAdvancedNativeSettings((open) => !open)}
                >
                  {showAdvancedNativeSettings ? 'Hide advanced settings' : 'Show advanced settings'}
                </Button>
                <Collapse expanded={showAdvancedNativeSettings}>
                  <Stack gap="sm">
                    <TextInput
                      label="Finalizer"
                      description="Symbol name called when this DLL is queued for unload"
                      placeholder="e.g. on_unload"
                      {...form.getInputProps('finalizer')}
                    />
                    <Select
                      label="Initializer"
                      description="Action to perform after this DLL successfully loads"
                      data={INITIALIZER_OPTIONS}
                      {...form.getInputProps('initializerType')}
                    />
                    <Collapse expanded={form.values.initializerType === 'delay'}>
                      <NumberInput
                        label="Delay (ms)"
                        description="Minimum delay in milliseconds before the initializer runs"
                        min={0}
                        {...form.getInputProps('initializerDelayMs')}
                      />
                    </Collapse>
                    <Collapse expanded={form.values.initializerType === 'function'}>
                      <TextInput
                        label="Initializer function"
                        description="Symbol name to call after this DLL loads"
                        placeholder="e.g. on_init"
                        {...form.getInputProps('initializerFunction')}
                      />
                    </Collapse>
                  </Stack>
                </Collapse>
              </>
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
