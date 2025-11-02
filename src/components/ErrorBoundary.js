// src/components/CashierSidebar.jsx
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Box
} from '@mui/material';
import {
  PointOfSale,
  Receipt,
  Inventory,
  History,
  ShoppingCart,
  Dashboard
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/cashier/dashboard' },
  { text: 'Point of Sale', icon: <PointOfSale />, path: '/cashier/point-of-sale' },
  { text: 'Sales', icon: <Receipt />, path: '/cashier/sales' },
  { text: 'Products', icon: <Inventory />, path: '/cashier/products' },
  { text: 'Transactions', icon: <History />, path: '/cashier/transactions' },
  { text: 'Orders', icon: <ShoppingCart />, path: '/cashier/orders' },
  { text: 'Products Management', icon: <Inventory />, path: '/cashier/products-management' }
];

const CashierSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" noWrap component="div">
          Cashier Panel
        </Typography>
      </Box>
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default CashierSidebar;