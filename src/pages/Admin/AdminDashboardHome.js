// // src/pages/Admin/AdminDashboardHome.js
// import React from 'react';
// import { Box, Typography, Paper, Grid } from '@mui/material';
// import {
//   PointOfSale,
//   People,
//   Inventory,
//   Store,
//   AttachMoney,
//   History
// } from '@mui/icons-material';

// const AdminDashboardHome = () => {
//   // Mock data for dashboard cards
//   const dashboardCards = [
//     { title: 'Total Sales', value: '$12,548', icon: <PointOfSale />, color: '#4caf50' },
//     { title: 'Active Cashiers', value: '8', icon: <People />, color: '#2196f3' },
//     { title: 'Products', value: '142', icon: <Inventory />, color: '#ff9800' },
//     { title: 'Shops', value: '3', icon: <Store />, color: '#e91e63' },
//     { title: 'Revenue', value: '$8,325', icon: <AttachMoney />, color: '#009688' },
//     { title: 'Transactions', value: '284', icon: <History />, color: '#607d8b' }
//   ];

//   return (
//     <Box>
//       <Typography variant="h4" gutterBottom>
//         Admin Dashboard
//       </Typography>
//       <Typography variant="body1" color="textSecondary" gutterBottom>
//         Welcome back! Here's an overview of your business performance.
//       </Typography>
      
//       <Grid container spacing={3} sx={{ mt: 2 }}>
//         {dashboardCards.map((card, index) => (
//           <Grid item xs={12} sm={6} md={4} key={index}>
//             <Paper 
//               elevation={2} 
//               sx={{ 
//                 p: 3, 
//                 display: 'flex', 
//                 alignItems: 'center',
//                 borderLeft: `4px solid ${card.color}`
//               }}
//             >
//               <Box sx={{ color: card.color, mr: 2, fontSize: 40 }}>
//                 {card.icon}
//               </Box>
//               <Box>
//                 <Typography variant="h6" component="div">
//                   {card.value}
//                 </Typography>
//                 <Typography variant="body2" color="textSecondary">
//                   {card.title}
//                 </Typography>
//               </Box>
//             </Paper>
//           </Grid>
//         ))}
//       </Grid>
//     </Box>
//   );
// };

// export default AdminDashboardHome;