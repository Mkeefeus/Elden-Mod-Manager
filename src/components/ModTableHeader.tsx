import { Table, Text, UnstyledButton, rem } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import React from 'react';

type ModTableHeaderProps = {
  label: string;
  sortedBy: boolean;
  sortIcon: string | boolean;
  handleSort?: () => void;
  style?: React.CSSProperties;
};

const ModTableHeader = ({ sortedBy, label, sortIcon, handleSort, style }: ModTableHeaderProps) => {
  const Icon = sortedBy ? (sortIcon === 'desc' ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th style={{ overflow: 'hidden', ...style }}>
      <UnstyledButton
        onClick={handleSort}
        style={{ display: 'flex', alignItems: 'center', gap: rem(4), width: '100%' }}
      >
        <Text size="sm" fw={500} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {label}
        </Text>
        <Icon style={{ width: rem(16), height: rem(16), flexShrink: 0 }} stroke={1.5} />
      </UnstyledButton>
    </Table.Th>
  );
};

export default ModTableHeader;
