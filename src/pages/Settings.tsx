import { useEffect, useState, ReactNode } from 'react';
import { Flex, TextInput, Button, Notification, rem, Stack, Group } from '@mantine/core';
import { IconX, IconCheck } from '@tabler/icons-react';

const Settings = () => {
  const xIcon = <IconX style={{ width: rem(20), height: rem(20) }} />;
  const checkIcon = <IconCheck style={{ width: rem(20), height: rem(20) }} />;

  type NotificationProps = {
    icon: ReactNode;
    color: string;
    title: string;
    children: string;
  };

  const [eldenRingPath, setEldenRingPath] = useState<string>('');
  const [modEnginePath, setModEnginePath] = useState<string>('');
  const [notificationProps, setNotificationProps] = useState<NotificationProps>();

  useEffect(() => {
    const eldenRingPath = localStorage.getItem('eldenRingPath');
    const modEnginePath = localStorage.getItem('modEnginePath');
    if (eldenRingPath) {
      setEldenRingPath(eldenRingPath);
    }
    if (modEnginePath) {
      setModEnginePath(modEnginePath);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setNotificationProps(undefined);
    }, 3500);
  }, [eldenRingPath, modEnginePath]);

  const handleGetExePath = async (buttonClicked: string) => {
    const path = await window.electronAPI.browse('exe', 'Select Elden Ring Executable');
    if (!path) {
      return;
    }
    switch (buttonClicked) {
      case 'eldenRing':
        setEldenRingPath(path);
        localStorage.setItem('eldenRingPath', path);
        setNotificationProps({
          icon: checkIcon,
          color: 'green',
          title: 'Success!',
          children: 'Elden Ring path set successfully',
        });
        break;
      case 'modEngine':
        setModEnginePath(path);
        localStorage.setItem('modEnginePath', path);
        setNotificationProps({
          icon: checkIcon,
          color: 'green',
          title: 'Success!',
          children: 'Mod Engine 2 path set successfully',
        });
        break;
      default:
        setNotificationProps({
          icon: xIcon,
          color: 'red',
          title: 'Bummer!',
          children: 'Something went wrong',
        });
        break;
    }
  };
  return (
    <Stack gap={'md'} style={{ height: '100%' }}>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Path to Elden Ring Executable"
          placeholder="Select Elden Ring Executable"
          required
          value={eldenRingPath}
          w={700}
        />
        <Button
          onClick={() => {
            handleGetExePath('eldenRing').catch(console.error);
          }}
        >
          Browse
        </Button>
      </Group>
      <Group align={'flex-end'} justify={'space-between'}>
        <TextInput
          label="Path to Mod Engine 2 Executable"
          placeholder="Select Mod Engine 2 Executable"
          required
          value={modEnginePath}
          w={700}
        />
        <Button onClick={() => handleGetExePath('modEngine').catch(console.error)}>Browse</Button>
      </Group>
      {notificationProps && (
        <Flex align={'flex-end'} justify={'flex-end'} mb={'auto'} mr={'auto'} pos={'absolute'}>
          <Notification
            icon={notificationProps?.icon}
            color={notificationProps?.color}
            title={notificationProps?.title}
            withCloseButton={false}
            withBorder
          >
            {notificationProps?.children}
          </Notification>
        </Flex>
      )}
    </Stack>
  );
};

export default Settings;
