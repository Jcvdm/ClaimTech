import React from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import ClaimsSidebar from './components/ClaimsSidebar';
import ClaimsList from './components/ClaimsList';
import ClaimsPreview from './components/ClaimsPreview';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <ClaimsSidebar />
        <ClaimsList />
        <ClaimsPreview />
      </Box>
    </ThemeProvider>
  );
}

export default App;
