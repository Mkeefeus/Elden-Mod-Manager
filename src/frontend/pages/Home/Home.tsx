import { Button, Typography, Box, Stack } from '@mui/material';
import ProfileGrid from './ProfileGrid';

const Home = () => {
  const homeContainerStyle = {
    flexGrow: 1,
    py: 2,
    px: 2,
  };

  return (
    <Box sx={homeContainerStyle}>
      <Stack spacing={2}>
        <Typography variant="h4">Recent Profiles</Typography>
        <ProfileGrid />
        <Typography variant="h4">Quick Actions</Typography>
        <Stack spacing={3} direction={'column'} alignSelf={'start'}>
          <Button variant="contained">Play Unmodded</Button>
          <Button variant="contained">Create a Profile</Button>
          <Button variant="contained">Add a File Mod</Button>
          <Button variant="contained">Add a DLL Mod</Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default Home;
