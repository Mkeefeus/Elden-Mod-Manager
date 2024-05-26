import React from 'react';
import { useNotificationModal } from '../providers/NotificationModalProvider';
import { Modal } from '@mantine/core';

const NotificationModal = () => {
  const { isOpen, titleState, modalContentState, hideModal } = useNotificationModal();
  const title = titleState[0];
  const modalContent = modalContentState[0];

  if (!modalContent) {
    return null;
  }

  return (
    <Modal opened={isOpen} title={title} onClose={hideModal} centered>
      {modalContent}
    </Modal>
  );
};

export default NotificationModal;
