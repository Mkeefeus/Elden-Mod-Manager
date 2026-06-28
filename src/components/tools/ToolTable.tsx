import { Button, Center, Table, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import SortableTableHeader from '../shared/SortableTableHeader';
import ToolTableMenu from './ToolTableMenu';
import TruncatedNameCell from '../shared/TruncatedNameCell';
import DateCell from '../shared/DateCell';
import { Tool } from 'types';
import TableHeader from '../shared/TableHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLink } from '@fortawesome/free-solid-svg-icons';

type ToolSortColumn = 'name' | 'version' | 'installDate';
type ToolSortState = { column: ToolSortColumn; order: 'asc' | 'desc' };

type ToolColumn = {
  label: string;
  align: 'left' | 'center' | 'right';
  color?: string;
  style?: React.CSSProperties;
  sortKey?: ToolSortColumn; // only present for sortable columns
};

const COLS: readonly ToolColumn[] = [
  { label: 'Open', style: { width: 130 }, align: 'center' },
  { label: 'Tool name', sortKey: 'name', align: 'left' },
  { label: 'Version', sortKey: 'version', style: { width: 110 }, align: 'center' },
  { label: 'Install Date', sortKey: 'installDate', style: { width: 130 }, align: 'center' },
  { label: 'More', style: { width: 90 }, align: 'center', color: 'dimmed' },
];

const ToolTable = ({ tools }: { tools: Tool[] }) => {
  const [sort, setSort] = useState<ToolSortState>({ column: 'installDate', order: 'desc' });

  const sortedTools = useMemo(() => {
    const getComparable = (value: string | boolean | number) => {
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    };

    return [...tools].sort((a, b) => {
      const aValue = getComparable(a[sort.column] || '');
      const bValue = getComparable(b[sort.column] || '');

      if (aValue < bValue) return sort.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tools, sort]);

  const handleSort = (column: ToolSortColumn) => {
    setSort((current) => {
      if (current.column === column) {
        return { column, order: current.order === 'asc' ? 'desc' : 'asc' };
      }
      return { column, order: 'desc' };
    });
  };

  return (
    <Table
      withRowBorders
      highlightOnHover
      layout="fixed"
      horizontalSpacing="xs"
      verticalSpacing="xs"
      style={{ width: '100%', minWidth: 520 }}
    >
      <Table.Thead>
        <Table.Tr>
          {COLS.map(({ label, sortKey, style, align }) =>
            sortKey ? (
              <SortableTableHeader
                key={sortKey || label}
                sortedBy={sort.column === sortKey}
                label={label}
                sortOrder={sort.order || false}
                onSort={() => handleSort(sortKey)}
                style={style}
                align={align}
              />
            ) : (
              <TableHeader key={label} label={label} style={style} align={align} />
            )
          )}
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {sortedTools.map((tool) => (
          <Table.Tr key={tool.id}>
            <Table.Td>
              <Center>
                <Button variant="transparent" color="gray" onClick={() => window.electronAPI.launchTool(tool.id)}>
                  <FontAwesomeIcon icon={faExternalLink} />
                </Button>
              </Center>
            </Table.Td>
            <TruncatedNameCell name={tool.name} />

            <Table.Td>
              <Center>
                <Text size="sm">{tool.version}</Text>
              </Center>
            </Table.Td>

            <DateCell value={tool.installDate} centered />

            <ToolTableMenu tool={tool} toolNames={tools.map((t) => t.name)} />
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

export default ToolTable;
