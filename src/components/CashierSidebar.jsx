// src/components/CashierSidebar.jsx
import { Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { PointOfSale, Receipt } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const CashierSidebar = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <List>
        <ListItem button component={Link} to="/cashier/terminal">
          <ListItemIcon>
            <PointOfSale />
          </ListItemIcon>
          <ListItemText primary="POS Terminal" />
        </ListItem>
        <ListItem button component={Link} to="/cashier/transactions">
          <ListItemIcon>
            <Receipt />
          </ListItemIcon>
          <ListItemText primary="Transactions" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default CashierSidebar;