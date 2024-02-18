import { useState } from 'react';
import { Table, Checkbox, Flex, Button } from '@mantine/core';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type mod = {
  enabled: boolean;
  name: string;
  installDate: string;
  isDll: boolean;
  isFileMod: boolean;
};

const debugMods: mod[] = [
  { enabled: true, name: 'Seemless Co-Op', installDate: '2021-10-01', isDll: true, isFileMod: false },
  { enabled: false, name: 'Item and Enemy Randomizer', installDate: '2021-10-01', isDll: false, isFileMod: true },
  { enabled: true, name: 'Melania Big Tiddy Mod', installDate: '2021-10-01', isDll: false, isFileMod: true },
];

const Mods = () => {
  const [mods, setMods] = useState<mod[]>(debugMods);

  const rows = mods.map((mod, index) => (
    <Table.Tr key={mod.name} bg={mod.enabled ? 'var(--mantine-color-blue-light)' : undefined}>
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={mod.enabled}
          onChange={() => {
            const newMods = [...mods];
            newMods[index].enabled = !newMods[index].enabled;
            setMods(newMods);
          }}
        />
      </Table.Td>
      <Table.Td>{mod.name}</Table.Td>
      <Table.Td>{mod.installDate}</Table.Td>
      <Table.Td style={{ textAlign: 'center' }}>{mod.isDll ? '✓' : undefined}</Table.Td>
      <Table.Td style={{ textAlign: 'center' }}>{mod.isFileMod ? '✓' : undefined}</Table.Td>
      <Table.Td>
        <Button variant="transparent" color="gray">
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Flex gap="xl" direction={'column'}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Enabled</Table.Th>
            <Table.Th>Mod name</Table.Th>
            <Table.Th>Install date</Table.Th>
            <Table.Th>Is DLL</Table.Th>
            <Table.Th>Is File Mod</Table.Th>
            <Table.Th>More</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
      <Flex gap={'md'}>
        <Button variant="outline" style={{ flex: 1 }}>
          Launch Game
        </Button>
        <Button variant="outline" style={{ flex: 1 }}>
          Add Mod
        </Button>
      </Flex>
    </Flex>
  );
};

export default Mods;
