import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Stack } from '@mui/material';
import Background from './Background';
import Navbar from './Navbar';

const App = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh' }}>
      <Stack direction="row" spacing={2}>
        <Navbar selectedTab={selectedTab} handleTabChange={handleTabChange} />
        <Background>
          <Outlet />
        </Background>
      </Stack>
    </Container>
  );
};

export default App;
