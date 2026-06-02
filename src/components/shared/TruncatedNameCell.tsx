import { Table, Text, Tooltip } from '@mantine/core';

type TruncatedNameCellProps = {
  name: string;
};

const TruncatedNameCell = ({ name }: TruncatedNameCellProps) => {
  return (
    <Table.Td style={{ maxWidth: 0, overflow: 'hidden' }}>
      <Tooltip label={name} openDelay={500} withArrow>
        <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </Text>
      </Tooltip>
    </Table.Td>
  );
};

export default TruncatedNameCell;
