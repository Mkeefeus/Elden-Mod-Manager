import { Button, Checkbox, Collapse, Group, NumberInput, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Mod, NativeInitializerCondition } from 'types';
import { useMods } from '../providers/ModsProvider';

type InitializerType = 'none' | 'delay' | 'function';

type EditNativeModFormValues = {
  loadEarly: boolean;
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

const modToFormValues = (mod: Mod): EditNativeModFormValues => {
  let initializerType: InitializerType = 'none';
  let initializerDelayMs = 0;
  let initializerFunction = '';
  if (mod.initializer) {
    if ('delay' in mod.initializer) {
      initializerType = 'delay';
      initializerDelayMs = mod.initializer.delay.ms;
    } else if ('function' in mod.initializer) {
      initializerType = 'function';
      initializerFunction = mod.initializer.function;
    }
  }
  return {
    loadEarly: mod.loadEarly ?? false,
    finalizer: mod.finalizer ?? '',
    initializerType,
    initializerDelayMs,
    initializerFunction,
  };
};

const formValuesToInitializer = (values: EditNativeModFormValues): NativeInitializerCondition | undefined => {
  if (values.initializerType === 'delay') return { delay: { ms: values.initializerDelayMs } };
  if (values.initializerType === 'function') return { function: values.initializerFunction };
  return undefined;
};

interface EditNativeModModalProps {
  mod: Mod;
  close: () => void;
}

const EditNativeModModal = ({ mod, close }: EditNativeModModalProps) => {
  const { mods, saveMods } = useMods();

  const form = useForm<EditNativeModFormValues>({
    initialValues: modToFormValues(mod),
  });

  const handleSubmit = async (values: EditNativeModFormValues) => {
    const updatedMod: Mod = {
      ...mod,
      loadEarly: values.loadEarly || undefined,
      finalizer: values.finalizer || undefined,
      initializer: formValuesToInitializer(values),
    };
    const updatedMods = mods.map((m) => (m.uuid === mod.uuid ? { ...updatedMod, enabled: m.enabled } : m));
    await saveMods(updatedMods);
    close();
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void handleSubmit(values);
      })}
    >
      <Stack gap="sm">
        <Checkbox
          label="Load early"
          description="Load this DLL before the game has fully initialized"
          {...form.getInputProps('loadEarly', { type: 'checkbox' })}
        />
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
        <Group justify="flex-end" mt="md">
          <Button type="submit" variant="filled">
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export default EditNativeModModal;
