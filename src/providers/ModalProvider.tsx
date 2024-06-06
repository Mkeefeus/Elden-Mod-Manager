import { useContext, createContext, Context, ReactNode, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import InstallME2Modal from '../components/InstallME2Modal';

interface ShowOptions {
  title: string;
  content: ReactNode;
}

interface ModalCtxValue {
  isOpen: boolean;
  showModal: (options: ShowOptions) => void;
  hideModal: () => void;
  title: string | undefined;
  modalContent: ReactNode | null;
}

const ModalContext = createContext<ModalCtxValue | null>(null);

const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, { open, close }] = useDisclosure();
  const titleState = useState<string | undefined>();
  const modalContentState = useState<ReactNode | null>(null);

  const showModal = ({ title, content }: ShowOptions) => {
    titleState[1](title);
    modalContentState[1](content);
    open();
  };

  const hideModal = () => {
    titleState[1](undefined);
    modalContentState[1](null);
    close();
  };

  // Main to Renderer modal triggers

  window.electronAPI.promptME2Install(() => {
    showModal({
      title: 'Install ModEngine2',
      content: <InstallME2Modal hideModal={hideModal} />,
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
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export default ModalProvider;

export const useModal = () => useContext<ModalCtxValue>(ModalContext as Context<ModalCtxValue>);
