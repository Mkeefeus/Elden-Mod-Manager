import { useContext, createContext, Context, ReactNode, useState, Dispatch, SetStateAction } from 'react';
import { useDisclosure } from '@mantine/hooks';

interface ShowOptions {
  title: string;
  content: ReactNode;
}

interface ModalCtxValue {
  isOpen: boolean;
  showModal: (options: ShowOptions) => void;
  hideModal: () => void;
  titleState: [string | undefined, Dispatch<SetStateAction<string | undefined>>];
  modalContentState: [ReactNode | null, Dispatch<SetStateAction<ReactNode | null>>];
}

const ModalContext = createContext<ModalCtxValue | null>(null);

const NotificationModalProvider = ({ children }: { children: ReactNode }) => {
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

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        showModal,
        hideModal,
        titleState,
        modalContentState,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export default NotificationModalProvider;

export const useNotificationModal = () => useContext<ModalCtxValue>(ModalContext as Context<ModalCtxValue>);
