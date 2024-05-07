import { TextInput, Button, Stack } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useState } from 'react';
import AddModSettings from './AddModSettings';
import { AddModFormValues } from 'types';
import { sleep } from '../utils/utilities';

interface AddModProps {
  close: () => void;
  fromZip?: boolean;
  namesInUse: string[];
  loadMods: () => void;
}

const AddMod = ({ close, fromZip, namesInUse, loadMods }: AddModProps) => {
  const [showSubmitLoader, setShowSubmitLoader] = useState(false);
  const [showExtractLoader, setShowExtractLoader] = useState(false);

  const cleanupModal = () => {
    setShowSubmitLoader(false);
    setShowExtractLoader(false);
    form.reset();
    close();
  };

  const nameNotInUse = (value: string) => {
    if (namesInUse.includes(value.toLowerCase())) {
      return 'Mod name is already in use';
    }
  };

  const form = useForm<AddModFormValues>({
    initialValues: {
      modName: '',
      isDll: false,
      path: '',
      delete: false,
      hasExe: false,
      exePath: '',
    },

    validate: {
      modName: isNotEmpty('Mod name is required') && nameNotInUse,

      path: isNotEmpty('Path is required'),
    },
  });

  const handleSubmit = async (values: AddModFormValues) => {
    values.modName = values.modName.trim();
    form.isValid;
    setShowSubmitLoader(true);
    const success = await window.electronAPI.addMod(values);
    if (!success) {
      cleanupModal();
      return;
    }
    await sleep(1000);
    loadMods();
    cleanupModal();
  };

  const extractZip = async () => {
    const zipPath = await window.electronAPI.browse('zip', 'Select zip file').catch(console.error);
    if (!zipPath) return;
    setShowExtractLoader(true);
    const extracted = await window.electronAPI.extractZip(zipPath);
    setShowExtractLoader(false);
    if (!extracted) return;
    return extracted;
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput withAsterisk label="Mod name" {...form.getInputProps('modName')} />
        <Button
          loading={showExtractLoader}
          onClick={async () => {
            // step 1, exctract zip to temp folder if required
            let tempPath: string | undefined;
            if (fromZip) {
              tempPath = await extractZip();
              if (!tempPath) return;
              return form.setFieldValue('path', tempPath);
            }
            // step 2, select folder to copy
            const pathToCopy = await window.electronAPI.browse('directory', 'Select mod folder');
            if (!pathToCopy) return;
            form.setFieldValue('path', pathToCopy);
          }}
        >
          Browse
        </Button>
        {form.values.path !== '' && <AddModSettings form={form} showLoader={showSubmitLoader} fromZip={fromZip}/>}
      </Stack>
    </form>
  );
};

export default AddMod;
