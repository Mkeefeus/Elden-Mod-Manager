import { useContext, createContext, Context, ReactNode, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import InstallME3Modal from '../components/InstallME3Modal';
import { MantineSize } from '@mantine/core';

interface ShowOptions {
  title: string;
  content: ReactNode;
  size?: MantineSize;
}

interface ModalCtxValue {
  isOpen: boolean;
  showModal: (options: ShowOptions) => void;
  hideModal: () => void;
  title: string | undefined;
  modalContent: ReactNode | null;
  modalSize: MantineSize;
}

const ModalContext = createContext<ModalCtxValue | null>(null);

const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, { open, close }] = useDisclosure();
  const titleState = useState<string | undefined>();
  const modalContentState = useState<ReactNode | null>(null);
  const modalSizeState = useState<MantineSize>('lg');

  const showModal = ({ title, content, size = 'lg' }: ShowOptions) => {
    titleState[1](title);
    modalContentState[1](content);
    modalSizeState[1](size);
    open();
  };

  const hideModal = () => {
    titleState[1](undefined);
    modalContentState[1](null);
    modalSizeState[1]('lg');
    close();
  };

  // Main to Renderer modal triggers

  window.electronAPI.promptME3Install(() => {
    showModal({
      title: 'Install ModEngine3',
      content: <InstallME3Modal hideModal={hideModal} />,
    });
  });

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        showModal,
        hideModal,
        title: titleState[0],
        modalContent: modalContentState[0],
        modalSize: modalSizeState[0],
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export default ModalProvider;

export const useModal = () => useContext<ModalCtxValue>(ModalContext as Context<ModalCtxValue>);
