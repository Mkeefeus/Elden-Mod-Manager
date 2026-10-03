import { Box, Group, Table, Text, Tooltip } from '@mantine/core';
import { ReactNode } from 'react';

type TruncatedNameCellProps = {
  name: string;
  // Rendered just right of the name; the name truncates first so this always stays visible
  badge?: ReactNode;
};

const TruncatedNameCell = ({ name, badge }: TruncatedNameCellProps) => {
  return (
    <Table.Td style={{ maxWidth: 0, overflow: 'hidden' }}>
      {/* Baseline (not center) alignment so the badge label sits on the same text line as the name */}
      <Group gap="xs" wrap="nowrap" align="baseline">
        <Tooltip label={name} openDelay={500} withArrow>
          <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {name}
          </Text>
        </Tooltip>
        {badge && <Box style={{ display: 'flex', flexShrink: 0 }}>{badge}</Box>}
      </Group>
    </Table.Td>
  );
};

export default TruncatedNameCell;
