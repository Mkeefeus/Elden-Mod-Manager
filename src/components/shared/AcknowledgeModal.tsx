import { Button, Stack } from '@mantine/core';
import { ReactNode } from 'react';

interface AcknowledgeModalProps {
  message: ReactNode;
  buttonLabel?: string;
  hideModal: () => void;
}

/**
 * A generic "here's some info" modal — just a message and a single button to dismiss it. No
 * cancel, no side effects on close. Useful for one-off heads-ups (e.g. a data migration notice)
 * that don't need their own bespoke modal component.
 */
const AcknowledgeModal = ({ message, buttonLabel = 'Got it', hideModal }: AcknowledgeModalProps) => (
  <Stack>
    {message}
    <Button onClick={hideModal}>{buttonLabel}</Button>
  </Stack>
);

export default AcknowledgeModal;
