import { useModal } from '../providers/ModalProvider';
import { Modal as MantineModal } from '@mantine/core';

const Modal = () => {
  const { isOpen, title, modalContent, hideModal } = useModal();

  return (
    <MantineModal opened={isOpen} title={title} onClose={() => hideModal()} centered>
      {isOpen && modalContent}
    </MantineModal>
  );
};

export default Modal;
