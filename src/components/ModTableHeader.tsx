import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Table, Flex } from '@mantine/core';
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
        <Flex gap="xs" align="center">
          {label}
          {sortIcon && <FontAwesomeIcon icon={sortIcon === 'asc' ? faSortUp : faSortDown} />}
        </Flex>
      </Button>
    </Table.Th>
  );
};

export default ModTableHeader;
