import { Table, Text } from '@mantine/core';

type TableHeaderProps = {
  label: string;
  style?: React.CSSProperties;
  align: 'left' | 'center' | 'right';
  color?: string;
};

const TableHeader = ({ label, style, align, color }: TableHeaderProps) => {
  return (
    <Table.Th c={color} style={{ ...style, textAlign: align }}>
      <Text size="sm" fw={500} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        {label}
      </Text>
    </Table.Th>
  );
};

export default TableHeader;
