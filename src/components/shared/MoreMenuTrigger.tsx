import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, Center } from '@mantine/core';

type MoreMenuTriggerProps = {
  ariaLabel: string;
};

const MoreMenuTrigger = ({ ariaLabel }: MoreMenuTriggerProps) => {
  return (
    <Center>
      <Button variant="transparent" color="gray" aria-label={ariaLabel}>
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </Button>
    </Center>
  );
};

export default MoreMenuTrigger;
