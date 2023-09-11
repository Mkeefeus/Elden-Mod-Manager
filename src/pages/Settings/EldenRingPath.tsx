import { TextField, Button, Stack } from '@mui/material';
import { FolderCopy } from '@mui/icons-material';

type EldenRingPathProps = {
    exePath: string;
    handleClick: () => void;
};

const EldenRingPath = ({exePath, handleClick}: EldenRingPathProps) => {
  return (
    <Stack spacing={2} direction={'row'}>
      <TextField
        variant="filled"
        label="Elden Ring Exe Path"
        color="secondary"
        sx={{
          flexBasis: 1000,
        }}
        value={exePath}
        focused
      />
      <Button
        component="label"
        variant="contained"
        startIcon={<FolderCopy />}
        onClick={handleClick}
        sx={{flexBasis: 175}}
      >
        Browse
      </Button>
    </Stack>
  );
};

export default EldenRingPath;
