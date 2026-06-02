import { Table, Text, UnstyledButton, rem } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import React from 'react';

type SortOrder = 'asc' | 'desc';

type SortableTableHeaderProps = {
  label: string;
  sortedBy: boolean;
  sortOrder: SortOrder | false;
  onSort?: () => void;
  style?: React.CSSProperties;
  align: 'left' | 'center' | 'right';
};

const SortableTableHeader = ({ sortedBy, label, sortOrder, onSort, style, align }: SortableTableHeaderProps) => {
  const Icon = sortedBy ? (sortOrder === 'desc' ? IconChevronUp : IconChevronDown) : IconSelector;

  return (
    <Table.Th style={{ overflow: 'hidden', ...style }}>
      <UnstyledButton
        onClick={onSort}
        style={{ display: 'flex', alignItems: 'center', gap: rem(4), width: '100%', justifyContent: align }}
      >
        <Text size="sm" fw={500} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {label}
        </Text>
        <Icon style={{ width: rem(16), height: rem(16), flexShrink: 0 }} stroke={1.5} />
      </UnstyledButton>
    </Table.Th>
  );
};

export default SortableTableHeader;
