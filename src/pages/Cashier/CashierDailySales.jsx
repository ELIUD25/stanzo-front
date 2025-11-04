// // src/pages/Cashier/CashierDailySales.jsx - PROFESSIONAL VERSION
// import React, { useState, useEffect } from 'react';
// import { 
//   Card, 
//   Statistic, 
//   Row, 
//   Col, 
//   Typography, 
//   Space, 
//   Tag, 
//   Descriptions, 
//   Alert, 
//   Button,
//   Progress,
//   Tooltip,
//   Spin
// } from 'antd';
// import { 
//   DollarOutlined, 
//   ShoppingCartOutlined, 
//   UserOutlined, 
//   ShopOutlined, 
//   CreditCardOutlined,
//   MoneyCollectOutlined,
//   BankOutlined,
//   ReloadOutlined,
//   InfoCircleOutlined,
//   FileTextOutlined
// } from '@ant-design/icons';
// import { transactionAPI, creditAPI } from '../../services/api';
// import dayjs from 'dayjs';

// const { Text, Title } = Typography;

// const CashierDailySales = ({ cashier, shop }) => {
//   const [dailyStats, setDailyStats] = useState({
//     totalSales: 0,
//     totalTransactions: 0,
//     totalItems: 0,
//     averageTransaction: 0,
//     cashAmount: 0,
//     bankMpesaAmount: 0,
//     creditAmount: 0,
//     creditTransactions: 0,
//     creditGivenToday: 0,
//     transactionCount: 0,
//     creditCount: 0,
//     date: dayjs().format('YYYY-MM-DD')
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [lastUpdated, setLastUpdated] = useState(null);
//   const [todayCredits, setTodayCredits] = useState([]);

//   // Calculate enhanced statistics including credit data
//   const calculateEnhancedStats = (transactionData, creditData) => {
//     const transactions = Array.isArray(transactionData) ? transactionData : [];
//     const credits = Array.isArray(creditData) ? creditData : [];

//     console.log('📊 Calculating enhanced stats:', {
//       transactions: transactions.length,
//       credits: credits.length,
//       creditData: credits
//     });

//     // Calculate from transactions
//     const totalSales = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
//     const totalTransactions = transactions.length;
//     const totalItems = transactions.reduce((sum, t) => 
//       sum + (t.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
//     );
    
//     // Calculate payment method breakdown from transactions
//     const cashAmount = transactions
//       .filter(t => t.paymentMethod === 'cash')
//       .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    
//     const bankMpesaAmount = transactions
//       .filter(t => t.paymentMethod === 'bank_mpesa')
//       .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    
//     const creditTransactionsFromSales = transactions
//       .filter(t => t.paymentMethod === 'credit');
    
//     const creditAmountFromSales = creditTransactionsFromSales
//       .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

//     // Calculate from credit records (this is the key fix)
//     const creditAmountFromCredits = credits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
//     const creditGivenToday = credits.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
//     const amountPaidToday = credits.reduce((sum, c) => sum + (c.amountPaid || 0), 0);

//     console.log('💰 Credit Analysis:', {
//       creditAmountFromSales,
//       creditAmountFromCredits,
//       creditGivenToday,
//       amountPaidToday,
//       creditsCount: credits.length
//     });

//     // Use the larger value between sales data and credit records
//     const finalCreditAmount = Math.max(creditAmountFromSales, creditAmountFromCredits);
//     const finalCreditTransactions = Math.max(creditTransactionsFromSales.length, credits.length);

//     const enhancedStats = {
//       totalSales: totalSales + Math.max(0, creditAmountFromCredits - creditAmountFromSales),
//       totalTransactions,
//       totalItems,
//       averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
//       cashAmount,
//       bankMpesaAmount,
//       creditAmount: finalCreditAmount,
//       creditTransactions: finalCreditTransactions,
//       creditGivenToday,
//       transactionCount: totalTransactions,
//       creditCount: credits.length,
//       date: dayjs().format('YYYY-MM-DD'),
//       // Additional calculated fields
//       amountPaidToday,
//       totalCreditBalance: creditGivenToday
//     };

//     console.log('✅ Final Enhanced Stats:', enhancedStats);
//     return enhancedStats;
//   };

//   // Fetch daily stats with credit integration
//   const fetchDailyStats = async () => {
//     if (!cashier?._id || !shop?._id) return;
    
//     setLoading(true);
//     setError(null);
    
//     try {
//       console.log('📊 Fetching comprehensive daily analysis...', {
//         cashierId: cashier._id,
//         shopId: shop._id,
//         date: dayjs().format('YYYY-MM-DD')
//       });

//       const today = dayjs().startOf('day').toISOString();
//       const now = dayjs().toISOString();

//       // Fetch transactions and credits in parallel
//       const [transactionsResponse, creditsResponse] = await Promise.all([
//         transactionAPI.getAll({
//           cashierId: cashier._id,
//           shopId: shop._id,
//           startDate: today,
//           endDate: now,
//           status: 'completed'
//         }),
//         creditAPI.getAll({
//           cashierId: cashier._id,
//           shopId: shop._id,
//           startDate: today,
//           endDate: now
//         })
//       ]);

//       const transactions = Array.isArray(transactionsResponse) ? transactionsResponse : [];
//       const creditsData = Array.isArray(creditsResponse?.data) ? creditsResponse.data : [];

//       console.log('📈 Fetched Data:', {
//         transactions: transactions.length,
//         credits: creditsData.length,
//         sampleCredits: creditsData.slice(0, 2)
//       });

//       setTodayCredits(creditsData);

//       // Calculate enhanced statistics
//       const enhancedStats = calculateEnhancedStats(transactions, creditsData);
//       setDailyStats(enhancedStats);
//       setLastUpdated(new Date().toISOString());
        
//     } catch (error) {
//       console.error('❌ Error fetching daily stats:', error);
//       setError(error.message || 'Failed to load daily statistics');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchDailyStats();
    
//     // Refresh every 5 minutes
//     const interval = setInterval(fetchDailyStats, 5 * 60 * 1000);
//     return () => clearInterval(interval);
//   }, [cashier, shop]);

//   const formatCurrency = (amount) => {
//     return `KES ${(amount || 0).toLocaleString('en-KE', { 
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2 
//     })}`;
//   };

//   // Calculate percentages
//   const creditPercentage = dailyStats.totalSales > 0 
//     ? (dailyStats.creditAmount / dailyStats.totalSales) * 100 
//     : 0;

//   const cashPercentage = dailyStats.totalSales > 0 
//     ? (dailyStats.cashAmount / dailyStats.totalSales) * 100 
//     : 0;

//   const bankMpesaPercentage = dailyStats.totalSales > 0 
//     ? (dailyStats.bankMpesaAmount / dailyStats.totalSales) * 100 
//     : 0;

//   const handleRefresh = () => {
//     fetchDailyStats();
//   };

//   if (error) {
//     return (
//       <Card>
//         <Alert
//           message="Error Loading Daily Stats"
//           description={error}
//           type="error"
//           showIcon
//           action={
//             <Button size="small" onClick={handleRefresh}>
//               Retry
//             </Button>
//           }
//         />
//       </Card>
//     );
//   }

//   return (
//     <Card 
//       title={
//         <Space>
//           <DollarOutlined />
//           Comprehensive Sales Analysis
//           <Tag color="blue">{dayjs().format('DD/MM/YYYY')}</Tag>
//           {loading && <Spin size="small" />}
//         </Space>
//       }
//       extra={
//         <Space>
//           <Button 
//             icon={<ReloadOutlined />} 
//             size="small" 
//             onClick={handleRefresh}
//             loading={loading}
//           >
//             Refresh
//           </Button>
//           <Text type="secondary">
//             {lastUpdated ? `Updated: ${dayjs(lastUpdated).format('HH:mm:ss')}` : 'Loading...'}
//           </Text>
//         </Space>
//       }
//     >
//       {/* Main Sales Overview */}
//       <Row gutter={16} style={{ marginBottom: 24 }}>
//         <Col xs={24} sm={12} md={8}>
//           <Card 
//             size="small" 
//             style={{ borderLeft: '4px solid #52c41a', background: '#f6ffed' }}
//           >
//             <Statistic
//               title="Total Sales"
//               value={dailyStats.totalSales}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ color: '#52c41a', fontSize: '20px' }}
//               suffix={
//                 <Tooltip title="Includes all completed sales (Cash + Bank/Mpesa + Credit)">
//                   <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
//                 </Tooltip>
//               }
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               {dailyStats.totalTransactions} transactions • {dailyStats.totalItems} items
//             </Text>
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} md={8}>
//           <Card 
//             size="small" 
//             style={{ borderLeft: '4px solid #fa8c16', background: '#fff7e6' }}
//           >
//             <Statistic
//               title="Credit Sales"
//               value={dailyStats.creditAmount}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ 
//                 color: dailyStats.creditAmount > 0 ? '#fa8c16' : '#8c8c8c',
//                 fontSize: '20px',
//                 fontWeight: 'bold'
//               }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               {dailyStats.creditTransactions} credit transactions
//             </Text>
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} md={8}>
//           <Card 
//             size="small" 
//             style={{ borderLeft: '4px solid #1890ff', background: '#f0f8ff' }}
//           >
//             <Statistic
//               title="Cash & Bank Sales"
//               value={dailyStats.cashAmount + dailyStats.bankMpesaAmount}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ color: '#1890ff', fontSize: '20px' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Immediate payment sales
//             </Text>
//           </Card>
//         </Col>
//       </Row>

//       {/* Payment Method Breakdown with Progress */}
//       <Card 
//         title={
//           <Space>
//             <CreditCardOutlined />
//             Payment Method Breakdown
//           </Space>
//         } 
//         style={{ marginBottom: 24 }}
//         size="small"
//       >
//         <Row gutter={16}>
//           <Col xs={24} sm={8}>
//             <div style={{ marginBottom: 16 }}>
//               <Space>
//                 <MoneyCollectOutlined style={{ color: '#cf1322' }} />
//                 <Text strong>Cash</Text>
//                 <Tag color="red">{formatCurrency(dailyStats.cashAmount)}</Tag>
//               </Space>
//               <Progress 
//                 percent={Math.round(cashPercentage)}
//                 strokeColor="#cf1322"
//                 size="small"
//                 format={() => `${cashPercentage.toFixed(1)}%`}
//               />
//             </div>
//           </Col>
//           <Col xs={24} sm={8}>
//             <div style={{ marginBottom: 16 }}>
//               <Space>
//                 <BankOutlined style={{ color: '#722ed1' }} />
//                 <Text strong>Bank/Mpesa</Text>
//                 <Tag color="purple">{formatCurrency(dailyStats.bankMpesaAmount)}</Tag>
//               </Space>
//               <Progress 
//                 percent={Math.round(bankMpesaPercentage)}
//                 strokeColor="#722ed1"
//                 size="small"
//                 format={() => `${bankMpesaPercentage.toFixed(1)}%`}
//               />
//             </div>
//           </Col>
//           <Col xs={24} sm={8}>
//             <div style={{ marginBottom: 16 }}>
//               <Space>
//                 <CreditCardOutlined style={{ color: '#fa8c16' }} />
//                 <Text strong>Credit</Text>
//                 <Tag color="orange">{formatCurrency(dailyStats.creditAmount)}</Tag>
//               </Space>
//               <Progress 
//                 percent={Math.round(creditPercentage)}
//                 strokeColor="#fa8c16"
//                 size="small"
//                 format={() => `${creditPercentage.toFixed(1)}%`}
//               />
//             </div>
//           </Col>
//         </Row>
//       </Card>

//       {/* Enhanced Credit Analysis */}
//       <Card 
//         title={
//           <Space>
//             <FileTextOutlined />
//             Credit Analysis Details
//             <Badge count={todayCredits.length} showZero style={{ backgroundColor: '#fa8c16' }} />
//           </Space>
//         } 
//         style={{ marginBottom: 24 }}
//         size="small"
//       >
//         <Row gutter={16}>
//           <Col xs={24} sm={12} md={6}>
//             <Statistic
//               title="Credit Given Today"
//               value={dailyStats.creditGivenToday}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ color: '#fa8c16' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Total outstanding credit
//             </Text>
//           </Col>
//           <Col xs={24} sm={12} md={6}>
//             <Statistic
//               title="Amount Paid Today"
//               value={dailyStats.amountPaidToday || 0}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ color: '#52c41a' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Credit payments received
//             </Text>
//           </Col>
//           <Col xs={24} sm={12} md={6}>
//             <Statistic
//               title="Credit Records"
//               value={dailyStats.creditCount}
//               valueStyle={{ color: '#1890ff' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Active credit transactions
//             </Text>
//           </Col>
//           <Col xs={24} sm={12} md={6}>
//             <Statistic
//               title="Avg. Credit Sale"
//               value={dailyStats.creditCount > 0 ? dailyStats.creditAmount / dailyStats.creditCount : 0}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ color: '#722ed1' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Per credit transaction
//             </Text>
//           </Col>
//         </Row>

//         {/* Credit Transactions Summary */}
//         {todayCredits.length > 0 && (
//           <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 6 }}>
//             <Text strong>Today's Credit Summary:</Text>
//             <br />
//             <Text>
//               {todayCredits.length} credit transactions totaling {formatCurrency(dailyStats.creditAmount)} • 
//               Outstanding: {formatCurrency(dailyStats.creditGivenToday)} • 
//               Paid: {formatCurrency(dailyStats.amountPaidToday || 0)}
//             </Text>
//           </div>
//         )}
//       </Card>

//       {/* Performance Metrics */}
//       <Row gutter={16} style={{ marginBottom: 24 }}>
//         <Col xs={24} sm={12}>
//           <Card size="small" title="Sales Efficiency">
//             <Statistic
//               title="Average Transaction Value"
//               value={dailyStats.averageTransaction}
//               precision={2}
//               prefix="KES"
//               valueStyle={{ color: '#1890ff' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Across all payment methods
//             </Text>
//           </Card>
//         </Col>
//         <Col xs={24} sm={12}>
//           <Card size="small" title="Productivity">
//             <Statistic
//               title="Items Per Transaction"
//               value={dailyStats.totalTransactions > 0 ? (dailyStats.totalItems / dailyStats.totalTransactions) : 0}
//               precision={1}
//               valueStyle={{ color: '#52c41a' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Average items per sale
//             </Text>
//           </Card>
//         </Col>
//       </Row>

//       {/* Summary Information */}
//       <Card size="small" type="inner" title="Analysis Summary">
//         <Descriptions size="small" column={1}>
//           <Descriptions.Item label="Cashier">
//             <Space>
//               <UserOutlined />
//               <Text strong>{cashier?.name || 'Unknown'}</Text>
//             </Space>
//           </Descriptions.Item>
//           <Descriptions.Item label="Shop">
//             <Space>
//               <ShopOutlined />
//               <Text strong>{shop?.name || 'Unknown'}</Text>
//             </Space>
//           </Descriptions.Item>
//           <Descriptions.Item label="Analysis Period">
//             <Text>Today ({dayjs().format('DD/MM/YYYY')}) - Real-time Analysis</Text>
//           </Descriptions.Item>
//           <Descriptions.Item label="Data Sources">
//             <Text>Sales Transactions + Credit Records Integration</Text>
//           </Descriptions.Item>
//           <Descriptions.Item label="Total Sales Formula">
//             <Text strong>Total Sales = Cash Sales + Bank/Mpesa Sales + Credit Sales</Text>
//           </Descriptions.Item>
//           <Descriptions.Item label="Credit Integration">
//             <Tag color="green">Enhanced Credit Tracking</Tag>
//             <Text>Includes both sales transactions and credit records</Text>
//           </Descriptions.Item>
//         </Descriptions>
//       </Card>
//     </Card>
//   );
// };

// export default CashierDailySales;