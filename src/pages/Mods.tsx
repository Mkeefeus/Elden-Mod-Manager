import { Flex, Button } from '@mantine/core';
import ModTable from '../components/ModTable';

const Mods = () => {
  return (
    <Flex gap="xl" direction={'column'}>
      <ModTable />
      <Flex gap={'md'}>
        <Button variant="outline" style={{ flex: 1 }}>
          Add Mod
        </Button>
        <Button variant="outline" style={{ flex: 1 }}>
          Launch Game
        </Button>
      </Flex>
    </Flex>
  );
};

export default Mods;
