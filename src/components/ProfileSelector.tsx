import { useState } from 'react';
import { Select, Group, ActionIcon, Tooltip, TextInput, Button, Stack, Text } from '@mantine/core';
import { useMods } from '../providers/ModsProvider';
import { useModal } from '../providers/ModalProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExport, faFileImport, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sendLog } from '../utils/rendererLogger';
import ImportProfileModal from './ImportProfileModal';

const ProfileSelector = ({ onApply }: { onApply?: () => void }) => {
  const { loadMods } = useMods();
  const { showModal, hideModal } = useModal();
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => window.electronAPI.loadProfiles(),
  });
  const { data: activeId = '' } = useQuery({
    queryKey: ['active-profile-id'],
    queryFn: () => window.electronAPI.getActiveProfileId(),
  });

  const handleProfileChange = async (uuid: string | null) => {
    if (!uuid) return;
    await window.electronAPI.applyProfile(uuid);
    queryClient.setQueryData(['active-profile-id'], uuid);
    void loadMods();
    onApply?.();
  };

  const handleNew = () => {
    showModal({
      title: 'New Profile',
      content: (
        <NewProfileModal
          onConfirm={(name) => {
            void handleCreate(name);
          }}
          onCancel={hideModal}
        />
      ),
    });
  };

  const handleCreate = async (name: string) => {
    hideModal();
    const newProfile = await window.electronAPI.createProfile(name);
    await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    await handleProfileChange(newProfile.uuid);
  };

  const handleDelete = () => {
    if (!activeId) return;
    const profile = profiles.find((p) => p.uuid === activeId);

    const confirmDelete = async () => {
      hideModal();
      const nextActive = profiles.find((p) => p.uuid !== activeId);
      if (!nextActive) {
        sendLog({
          level: 'warning',
          message: "You can't delete the last remaining profile. Please create a new profile before deleting this one.",
        });
        return;
      }

      const nextActiveId = await window.electronAPI.deleteProfile(activeId);
      queryClient.setQueryData(['active-profile-id'], nextActiveId);
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['active-profile-id'] });
      await loadMods();
      onApply?.();
    };

    showModal({
      title: 'Delete Profile',
      content: (
        <DeleteProfileModal
          name={profile?.name ?? ''}
          onConfirm={() => {
            void confirmDelete();
          }}
          onCancel={hideModal}
        />
      ),
    });
  };

  const handleExport = () => {
    if (!activeId) return;
    window.electronAPI.exportProfile(activeId);
  };

  const handleImport = () => {
    showModal({
      title: 'Import Profile',
      content: (
        <ImportProfileModal
          onClose={hideModal}
          onImported={(uuid) => {
            queryClient.setQueryData(['active-profile-id'], uuid);
            void loadMods();
            onApply?.();
          }}
        />
      ),
      size: 'lg',
      onBeforeClose: () => window.electronAPI.updateImportQueue([]),
    });
  };

  const selectData = profiles.map((p) => ({ value: p.uuid, label: p.name }));

  return (
    <Group gap="xs">
      <Select
        placeholder="No profile"
        data={selectData}
        value={activeId || null}
        onChange={(v) => {
          void handleProfileChange(v);
        }}
        style={{ minWidth: 180 }}
      />
      <Tooltip label="New profile">
        <ActionIcon variant="outline" onClick={handleNew}>
          <FontAwesomeIcon icon={faPlus} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Export profile">
        <ActionIcon variant="outline" disabled={!activeId} onClick={() => void handleExport()}>
          <FontAwesomeIcon icon={faFileExport} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Import profile">
        <ActionIcon variant="outline" onClick={handleImport}>
          <FontAwesomeIcon icon={faFileImport} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Delete profile">
        <ActionIcon variant="outline" color="red.8" disabled={!activeId} onClick={handleDelete}>
          <FontAwesomeIcon icon={faTrash} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

export default ProfileSelector;

// ---------- inline sub-modals ----------

interface NewProfileModalProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const NewProfileModal = ({ onConfirm, onCancel }: NewProfileModalProps) => {
  const [name, setName] = useState('');
  return (
    <Stack>
      <TextInput
        label="Profile name"
        placeholder="e.g. Seamless Co-op run"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        autoFocus
      />
      <Group justify="flex-end" mt="sm">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>
          Create
        </Button>
      </Group>
    </Stack>
  );
};

interface DeleteProfileModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteProfileModal = ({ name, onConfirm, onCancel }: DeleteProfileModalProps) => (
  <Stack>
    <Text>
      Are you sure you want to delete the profile <strong>{name}</strong>? This cannot be undone.
    </Text>
    <Group justify="flex-end" mt="sm">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button color="red" onClick={onConfirm}>
        Delete
      </Button>
    </Group>
  </Stack>
);
