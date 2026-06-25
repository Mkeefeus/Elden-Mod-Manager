import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { Button, ButtonProps } from '@mantine/core';
import { forwardRef } from 'react';

type MoreMenuTriggerProps = ButtonProps & {
  ariaLabel: string;
};

const MoreMenuTrigger = forwardRef<HTMLButtonElement, MoreMenuTriggerProps>(({ ariaLabel, ...props }, ref) => {
  return (
    <Button ref={ref} variant="transparent" color="gray" aria-label={ariaLabel} {...props}>
      <FontAwesomeIcon icon={faEllipsisVertical} />
    </Button>
  );
});

MoreMenuTrigger.displayName = 'MoreMenuTrigger';

export default MoreMenuTrigger;
