import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Space, Table } from '@mantine/core';
import { faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

type ModTableHeaderProps = {
  label: string;
  sortIcon: string | boolean;
  handleSort?: () => void;
};

const ModTableHeader = ({ label, sortIcon, handleSort }: ModTableHeaderProps) => {
  return (
    <Table.Th style={{ textAlign: 'center' }}>
      <Button variant="transparent" color="gray" onClick={handleSort}>
        {label}
        <Space w="xs" />
        {sortIcon && <FontAwesomeIcon icon={sortIcon === 'asc' ? faSortUp : faSortDown} />}
      </Button>
    </Table.Th>
  );
};

export default ModTableHeader;
