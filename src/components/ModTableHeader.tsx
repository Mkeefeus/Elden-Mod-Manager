import { Button, Space, Table, rem } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';

type ModTableHeaderProps = {
  label: string;
  sortedBy: boolean;
  sortIcon: string | boolean;
  handleSort?: () => void;
};

const ModTableHeader = ({ sortedBy, label, sortIcon, handleSort }: ModTableHeaderProps) => {
  const Icon = sortedBy ? (sortIcon === 'desc' ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th style={{ textAlign: 'center' }}>
      <Button variant="transparent" color="gray" onClick={handleSort}>
        {label}
        <Space w="xs" />
        <Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
      </Button>
    </Table.Th>
  );
};

export default ModTableHeader;
