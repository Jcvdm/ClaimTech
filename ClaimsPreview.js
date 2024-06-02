import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function ClaimsPreview() {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Claim #12345 Details
        </Typography>
        <Typography variant="body1">
          Submitted by: John Doe
          <br />
          Date: 2024-06-01
          <br />
          Status: Pending
          <br />
          Description: Damage to front bumper from a minor collision...
        </Typography>
      </Paper>
    </Box>
  );
}

export default ClaimsPreview;
