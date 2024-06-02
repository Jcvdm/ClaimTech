import React from 'react';
import { Box, List, ListItem, ListItemText, Divider, Typography } from '@mui/material';

function ClaimsList() {
  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      <Typography variant="h6" component="div" sx={{ padding: 2 }}>
        Claims List
      </Typography>
      <List>
        <ListItem alignItems="flex-start">
          <ListItemText
            primary="Claim #12345"
            secondary="Submitted by: John Doe - Status: Pending"
          />
        </ListItem>
        <Divider variant="inset" component="li" />
        <ListItem alignItems="flex-start">
          <ListItemText
            primary="Claim #12346"
            secondary="Submitted by: Jane Smith - Status: Approved"
          />
        </ListItem>
      </List>
    </Box>
  );
}

export default ClaimsList;
