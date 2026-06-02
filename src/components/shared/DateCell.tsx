import { Center, Table, Text } from '@mantine/core';
import { formatUsShortDate } from '@utils/utilities';

type DateCellProps = {
  value: string | number | Date;
  centered?: boolean;
};

const DateCell = ({ value, centered = false }: DateCellProps) => {
  if (!centered) {
    return (
      <Table.Td>
        <Text size="sm">{formatUsShortDate(value)}</Text>
      </Table.Td>
    );
  }

  return (
    <Table.Td>
      <Center>
        <Text size="sm">{formatUsShortDate(value)}</Text>
      </Center>
    </Table.Td>
  );
};

export default DateCell;
