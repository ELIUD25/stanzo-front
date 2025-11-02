// components/CashierMainDashboard.js
import { Box, Typography, Paper } from '@mui/material';
import { PointOfSale } from '@mui/icons-material';

const CashierMainDashboard = () => {
  return (
    <Box>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <PointOfSale sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Welcome to Your Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Use the sidebar to navigate through the available options.
        </Typography>
      </Paper>
    </Box>
  );
};

export default CashierMainDashboard;