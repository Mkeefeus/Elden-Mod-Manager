import React, { useEffect, useState } from 'react';
import { Flex, FileInput, TextInput, Button, Notification, rem, Box } from '@mantine/core';
import { IconX, IconCheck } from '@tabler/icons-react';
import Footer from '@src/components/Footer';

const Settings = () => {
  const xIcon = <IconX style={{ width: rem(20), height: rem(20) }} />;
  const checkIcon = <IconCheck style={{ width: rem(20), height: rem(20) }} />;

  type NotificationProps = {
    icon: React.ReactNode;
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
    const path = await window.electronAPI.browseForExe();
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
    <>
      <Box my="auto" mb="xl" mih="100%">
        <Flex direction={'column'}>
          <Flex direction={'row'} align={'flex-end'} justify={'space-between'}>
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
          </Flex>
          <Flex direction={'row'} align={'flex-end'} justify={'space-between'}>
            <TextInput
              label="Path to Mod Engine 2 Executable"
              placeholder="Select Mod Engine 2 Executable"
              required
              value={modEnginePath}
              w={700}
            />
            <Button onClick={() => handleGetExePath('modEngine').catch(console.error)}>Browse</Button>
          </Flex>
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
        </Flex>
      </Box>
    </>
  );
};

export default Settings;
