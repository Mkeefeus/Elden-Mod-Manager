import { Button, Group, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import ModTable from '@components/ModTable';
import AddModModal from '@components/AddModModal';

const Mods = () => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Stack gap="xl" justify={'center'}>
      <ModTable />
      <Group gap={'md'}>
        <Modal opened={opened} onClose={close} title="Add Mod" centered>
          <AddModModal />
        </Modal>
        <Button onClick={open} variant="outline">
          Add Mod
        </Button>
        <Button variant="outline">Launch Game</Button>
      </Group>
    </Stack>
  );
};

export default Mods;
