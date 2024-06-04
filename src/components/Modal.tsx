import { useModal } from '../providers/ModalProvider';
import { Modal as MantineModal } from '@mantine/core';

const Modal = () => {
  const { isOpen, titleState, modalContentState, hideModal } = useModal();
  const title = titleState[0];
  const modalContent = modalContentState[0];

  return (
    <MantineModal opened={isOpen} title={title} onClose={() => hideModal()} centered>
      {isOpen && modalContent}
    </MantineModal>
  );
};

export default Modal;
