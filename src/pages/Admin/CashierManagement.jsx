// import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// import { 
//   Table, 
//   Button, 
//   Modal, 
//   Form, 
//   Input, 
//   message,
//   Space,
//   Typography,
//   Card,
//   Alert,
//   Tabs,
//   Row,
//   Col,
//   Statistic,
//   Tag,
//   Progress,
//   DatePicker,
//   Select,
//   Tooltip,
//   Spin,
//   Empty,
//   Badge,
//   Divider,
//   List,
//   Avatar
// } from 'antd';

// import { 
//   UserAddOutlined, 
//   EditOutlined, 
//   DeleteOutlined, 
//   EyeOutlined,
//   BarChartOutlined,
//   TeamOutlined,
//   DollarOutlined,
//   ShoppingCartOutlined,
//   CalculatorOutlined,
//   RiseOutlined,
//   FallOutlined,
//   CalendarOutlined,
//   ReloadOutlined,
//   FilterOutlined,
//   CreditCardOutlined
// } from '@ant-design/icons';
// import axios from 'axios';
// import CashierDailyPerformance from '../../components/CashierDailyPerformance';
// import { transactionAPI, creditAPI } from '../../services/api';
// import dayjs from 'dayjs';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;
// const { confirm } = Modal;
// const { RangePicker } = DatePicker;
// const { Option } = Select;

// // Enhanced Cashier Analytics Component with Credit Support
// const CashierAnalytics = ({ cashier, transactions, credits, loading }) => {
//   const [dateRange, setDateRange] = useState([
//     dayjs().subtract(7, 'days'),
//     dayjs()
//   ]);
//   const [timeRange, setTimeRange] = useState('7d');

//   // Calculate cashier performance metrics with credit support
//   const cashierStats = useMemo(() => {
//     if (!cashier || !transactions || !Array.isArray(transactions)) {
//       return getDefaultCashierStats();
//     }

//     // Filter transactions for this cashier
//     const cashierTransactions = transactions.filter(t => 
//       t.cashierName === cashier.name || t.cashierId === cashier._id
//     );

//     // Filter by date range
//     const filteredTransactions = cashierTransactions.filter(t => {
//       if (!dateRange || dateRange.length !== 2) return true;
      
//       const transactionDate = dayjs(t.saleDate || t.createdAt);
//       const startDate = dateRange[0];
//       const endDate = dateRange[1];
      
//       return transactionDate.isAfter(startDate) && transactionDate.isBefore(endDate);
//     });

//     if (filteredTransactions.length === 0) {
//       return getDefaultCashierStats();
//     }

//     // Calculate metrics
//     const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
//     const totalCost = filteredTransactions.reduce((sum, t) => sum + (t.cost || 0), 0);
//     const totalProfit = filteredTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);
//     const totalTransactions = filteredTransactions.length;
//     const totalItemsSold = filteredTransactions.reduce((sum, t) => sum + (t.itemsCount || 0), 0);
    
//     // REMOVED: Average transaction value calculation
//     const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

//     // Credit-specific calculations
//     const cashierCredits = credits?.filter(credit => 
//       credit.cashierId === cashier._id || credit.cashierName === cashier.name
//     ) || [];
    
//     const creditSales = filteredTransactions.filter(t => t.paymentMethod === 'credit');
//     const totalCreditAmount = creditSales.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
//     const outstandingCredit = cashierCredits
//       .filter(credit => credit.status !== 'paid')
//       .reduce((sum, credit) => sum + (credit.balanceDue || 0), 0);

//     // Daily performance
//     const dailyPerformance = {};
//     filteredTransactions.forEach(t => {
//       const date = dayjs(t.saleDate || t.createdAt).format('YYYY-MM-DD');
//       if (!dailyPerformance[date]) {
//         dailyPerformance[date] = {
//           date,
//           revenue: 0,
//           transactions: 0,
//           profit: 0,
//           itemsSold: 0,
//           creditSales: 0,
//           creditAmount: 0
//         };
//       }
//       dailyPerformance[date].revenue += t.totalAmount || 0;
//       dailyPerformance[date].transactions += 1;
//       dailyPerformance[date].profit += t.profit || 0;
//       dailyPerformance[date].itemsSold += t.itemsCount || 0;
      
//       if (t.paymentMethod === 'credit') {
//         dailyPerformance[date].creditSales += 1;
//         dailyPerformance[date].creditAmount += t.totalAmount || 0;
//       }
//     });

//     // Top products
//     const productSales = {};
//     filteredTransactions.forEach(t => {
//       t.items?.forEach(item => {
//         const productName = item.productName || 'Unknown Product';
//         if (!productSales[productName]) {
//           productSales[productName] = {
//             name: productName,
//             quantity: 0,
//             revenue: 0,
//             profit: 0
//           };
//         }
//         productSales[productName].quantity += item.quantity || 1;
//         productSales[productName].revenue += item.totalPrice || 0;
//         productSales[productName].profit += item.profit || 0;
//       });
//     });

//     return {
//       totalRevenue,
//       totalCost,
//       totalProfit,
//       totalTransactions,
//       totalItemsSold,
//       profitMargin,
      
//       // Credit metrics
//       creditSalesCount: creditSales.length,
//       totalCreditAmount,
//       outstandingCredit,
//       cashierCredits,
      
//       dailyPerformance: Object.values(dailyPerformance).sort((a, b) => 
//         dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
//       ),
//       topProducts: Object.values(productSales)
//         .sort((a, b) => b.revenue - a.revenue)
//         .slice(0, 5),
//       period: {
//         start: dateRange[0]?.format('YYYY-MM-DD'),
//         end: dateRange[1]?.format('YYYY-MM-DD')
//       }
//     };
//   }, [cashier, transactions, credits, dateRange]);

//   const getProfitColor = (profit) => {
//     return profit >= 0 ? '#3f8600' : '#cf1322';
//   };

//   const getProfitIcon = (profit) => {
//     return profit >= 0 ? <RiseOutlined /> : <FallOutlined />;
//   };

//   const formatCurrency = (amount) => {
//     return `KES ${(amount || 0).toLocaleString('en-KE', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     })}`;
//   };

//   const handleTimeRangeChange = (value) => {
//     setTimeRange(value);
//     const now = dayjs();
//     let startDate;

//     switch (value) {
//       case 'today':
//         startDate = now.startOf('day');
//         break;
//       case '7d':
//         startDate = now.subtract(7, 'days');
//         break;
//       case '30d':
//         startDate = now.subtract(30, 'days');
//         break;
//       case '90d':
//         startDate = now.subtract(90, 'days');
//         break;
//       default:
//         startDate = now.subtract(7, 'days');
//     }

//     setDateRange([startDate, now]);
//   };

//   if (!cashier) {
//     return (
//       <Card>
//         <Empty description="Select a cashier to view analytics" />
//       </Card>
//     );
//   }

//   return (
//     <div>
//       {/* Header with Cashier Info and Filters */}
//       <Card>
//         <Row gutter={[16, 16]} align="middle">
//           <Col span={12}>
//             <Space>
//               <Avatar size="large" style={{ backgroundColor: '#1890ff' }}>
//                 {cashier.name?.charAt(0)?.toUpperCase()}
//               </Avatar>
//               <div>
//                 <Title level={4} style={{ margin: 0 }}>{cashier.name}</Title>
//                 <Text type="secondary">{cashier.email}</Text>
//                 <div>
//                   <Tag color={cashier.status === 'active' ? 'green' : 'red'}>
//                     {cashier.status?.toUpperCase()}
//                   </Tag>
//                   {cashier.club && <Tag color="blue">{cashier.club}</Tag>}
//                 </div>
//               </div>
//             </Space>
//           </Col>
//           <Col span={12}>
//             <Space style={{ float: 'right' }}>
//               <Text strong>Time Range:</Text>
//               <Select 
//                 value={timeRange} 
//                 onChange={handleTimeRangeChange}
//                 style={{ width: 120 }}
//               >
//                 <Option value="today">Today</Option>
//                 <Option value="7d">Last 7 Days</Option>
//                 <Option value="30d">Last 30 Days</Option>
//                 <Option value="90d">Last 90 Days</Option>
//                 <Option value="custom">Custom</Option>
//               </Select>
//               {timeRange === 'custom' && (
//                 <RangePicker
//                   value={dateRange}
//                   onChange={setDateRange}
//                 />
//               )}
//             </Space>
//           </Col>
//         </Row>
//       </Card>

//       {/* Key Metrics - UPDATED: Removed average transaction, added credit metrics */}
//       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
//         <Col xs={24} sm={12} md={8} lg={6}>
//           <Card>
//             <Statistic
//               title="Total Revenue"
//               value={cashierStats.totalRevenue}
//               prefix="KES"
//               precision={2}
//               valueStyle={{ color: '#1890ff' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               {cashierStats.totalTransactions} transactions
//             </Text>
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} md={8} lg={6}>
//           <Card>
//             <Statistic
//               title="Total Profit"
//               value={cashierStats.totalProfit}
//               prefix="KES"
//               precision={2}
//               valueStyle={{ color: getProfitColor(cashierStats.totalProfit) }}
//               prefix={getProfitIcon(cashierStats.totalProfit)}
//             />
//             <Progress 
//               percent={Math.min(100, Math.max(0, cashierStats.profitMargin))}
//               size="small"
//               format={percent => `${(percent || 0).toFixed(1)}%`}
//               status={cashierStats.profitMargin >= 0 ? 'normal' : 'exception'}
//             />
//           </Card>
//         </Col>
//         {/* REMOVED: Average Transaction Value Card */}
//         <Col xs={24} sm={12} md={8} lg={6}>
//           <Card>
//             <Statistic
//               title="Credit Sales"
//               value={cashierStats.totalCreditAmount || 0}
//               prefix="KES"
//               precision={2}
//               valueStyle={{ color: '#faad14' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               {cashierStats.creditSalesCount || 0} credit transactions
//             </Text>
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} md={8} lg={6}>
//           <Card>
//             <Statistic
//               title="Outstanding Credit"
//               value={cashierStats.outstandingCredit || 0}
//               prefix="KES"
//               precision={2}
//               valueStyle={{ color: '#cf1322' }}
//             />
//             <Text type="secondary" style={{ fontSize: '12px' }}>
//               Unpaid credit balance
//             </Text>
//           </Card>
//         </Col>
//       </Row>

//       {/* Detailed Analytics */}
//       <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
//         {/* Credit Analysis */}
//         <Col xs={24} lg={12}>
//           <Card title="Credit Analysis" size="small">
//             {cashierStats.cashierCredits && cashierStats.cashierCredits.length > 0 ? (
//               <List
//                 dataSource={cashierStats.cashierCredits.slice(0, 5)}
//                 renderItem={credit => (
//                   <List.Item>
//                     <List.Item.Meta
//                       avatar={
//                         <Avatar icon={<CreditCardOutlined />} />
//                       }
//                       title={
//                         <Space>
//                           <Text strong>{credit.customerName || 'Unknown Customer'}</Text>
//                           <Tag color={credit.status === 'paid' ? 'green' : 'orange'}>
//                             {credit.status?.toUpperCase()}
//                           </Tag>
//                         </Space>
//                       }
//                       description={
//                         <div>
//                           <div>Total: {formatCurrency(credit.totalAmount)}</div>
//                           <div>Paid: {formatCurrency(credit.amountPaid)}</div>
//                           <div>Balance: {formatCurrency(credit.balanceDue)}</div>
//                           {credit.dueDate && (
//                             <div>Due: {dayjs(credit.dueDate).format('DD/MM/YYYY')}</div>
//                           )}
//                         </div>
//                       }
//                     />
//                   </List.Item>
//                 )}
//               />
//             ) : (
//               <Empty description="No credit data available" />
//             )}
//           </Card>
//         </Col>

//         {/* Top Products */}
//         <Col xs={24} lg={12}>
//           <Card title="Top Selling Products" size="small">
//             {cashierStats.topProducts.length > 0 ? (
//               <List
//                 dataSource={cashierStats.topProducts}
//                 renderItem={(product, index) => (
//                   <List.Item>
//                     <List.Item.Meta
//                       avatar={
//                         <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#1890ff' : '#d9d9d9'}>
//                           <Avatar size="small">{product.name.charAt(0).toUpperCase()}</Avatar>
//                         </Badge>
//                       }
//                       title={product.name}
//                       description={
//                         <Space direction="vertical" size={0}>
//                           <Text type="secondary">
//                             Sold: {product.quantity} units
//                           </Text>
//                           <Text strong>
//                             Revenue: {formatCurrency(product.revenue)}
//                           </Text>
//                           <Text style={{ color: getProfitColor(product.profit) }}>
//                             Profit: {formatCurrency(product.profit)}
//                           </Text>
//                         </Space>
//                       }
//                     />
//                   </List.Item>
//                 )}
//               />
//             ) : (
//               <Empty description="No product sales data available" />
//             )}
//           </Card>
//         </Col>
//       </Row>

//       {/* Daily Performance */}
//       <Card title="Daily Performance" style={{ marginTop: 16 }}>
//         {cashierStats.dailyPerformance.length > 0 ? (
//           <List
//             dataSource={cashierStats.dailyPerformance}
//             renderItem={day => (
//               <List.Item>
//                 <List.Item.Meta
//                   avatar={<CalendarOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
//                   title={
//                     <Space>
//                       <Text strong>{dayjs(day.date).format('DD MMM YYYY')}</Text>
//                       <Tag color="blue">{day.transactions} transactions</Tag>
//                       {day.creditSales > 0 && (
//                         <Tag color="orange">{day.creditSales} credit</Tag>
//                       )}
//                     </Space>
//                   }
//                   description={
//                     <Row gutter={16}>
//                       <Col span={6}>
//                         <Text strong>Revenue: </Text>
//                         <Text style={{ color: '#1890ff' }}>
//                           {formatCurrency(day.revenue)}
//                         </Text>
//                       </Col>
//                       <Col span={6}>
//                         <Text strong>Profit: </Text>
//                         <Text style={{ color: getProfitColor(day.profit) }}>
//                           {formatCurrency(day.profit)}
//                         </Text>
//                       </Col>
//                       <Col span={6}>
//                         <Text strong>Items: </Text>
//                         <Text>{day.itemsSold}</Text>
//                       </Col>
//                       <Col span={6}>
//                         <Text strong>Credit: </Text>
//                         <Text style={{ color: '#faad14' }}>
//                           {formatCurrency(day.creditAmount)}
//                         </Text>
//                       </Col>
//                     </Row>
//                   }
//                 />
//               </List.Item>
//             )}
//           />
//         ) : (
//           <Empty description="No daily performance data available for the selected period" />
//         )}
//       </Card>
//     </div>
//   );
// };

// const getDefaultCashierStats = () => ({
//   totalRevenue: 0,
//   totalCost: 0,
//   totalProfit: 0,
//   totalTransactions: 0,
//   totalItemsSold: 0,
//   profitMargin: 0,
//   // Credit defaults
//   creditSalesCount: 0,
//   totalCreditAmount: 0,
//   outstandingCredit: 0,
//   cashierCredits: [],
//   dailyPerformance: [],
//   topProducts: []
// });

// // Enhanced Cashier Management Component with Credit Support
// const CashierManagement = () => {
//   const [cashiers, setCashiers] = useState([]);
//   const [isModalVisible, setIsModalVisible] = useState(false);
//   const [isViewModalVisible, setIsViewModalVisible] = useState(false);
//   const [editingCashier, setEditingCashier] = useState(null);
//   const [connectionError, setConnectionError] = useState(false);
//   const [loading, setLoading] = useState({
//     table: false,
//     form: false,
//     action: false,
//     analytics: false
//   });
//   const [activeTab, setActiveTab] = useState('cashiers');
//   const [selectedCashier, setSelectedCashier] = useState(null);
//   const [transactions, setTransactions] = useState([]);
//   const [credits, setCredits] = useState([]); // NEW: Credit data state
//   const [currentUser] = useState({
//     _id: 'admin',
//     role: 'admin',
//     name: 'Admin User'
//   });
  
//   const [form] = Form.useForm();
//   const cashiersCache = useRef({
//     data: [],
//     lastFetch: null
//   });

//   // Configure axios with correct base URL
//   const createApiInstance = () => {
//     const instance = axios.create({
//       baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
//       // baseURL: process.env.REACT_APP_API_URL || 'https://stanzo-back.vercel.app/',
//       timeout: 10000,
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     instance.interceptors.response.use(
//       (response) => response,
//       (error) => {
//         if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
//           setConnectionError(true);
//           message.error('Cannot connect to server. Please check if the backend is running.');
//         }
//         return Promise.reject(error);
//       }
//     );

//     return instance;
//   };

//   const fetchCashiers = useCallback(async (forceRefresh = false) => {
//     try {
//       const cacheValid = cashiersCache.current.lastFetch && 
//                        (Date.now() - cashiersCache.current.lastFetch < 30000);
      
//       if (cacheValid && !forceRefresh) {
//         setCashiers(cashiersCache.current.data);
//         return;
//       }

//       setLoading(prev => ({ ...prev, table: true }));
//       setConnectionError(false);
      
//       const api = createApiInstance();
//       const response = await api.get('/api/cashiers');
      
//       cashiersCache.current = {
//         data: response.data.data || response.data || [],
//         lastFetch: Date.now()
//       };
      
//       setCashiers(cashiersCache.current.data);
//     } catch (error) {
//       console.error('Fetch cashiers error:', error);
      
//       if (cashiersCache.current.data.length > 0) {
//         setCashiers(cashiersCache.current.data);
//         message.warning('Using cached data - could not refresh from server');
//       } else {
//         handleApiError(error, 'Failed to fetch cashiers');
//       }
//     } finally {
//       setLoading(prev => ({ ...prev, table: false }));
//     }
//   }, []);

//   // Fetch transactions for analytics
//   const fetchTransactions = useCallback(async () => {
//     try {
//       setLoading(prev => ({ ...prev, analytics: true }));
//       const comprehensiveData = await transactionAPI.getComprehensiveData();
//       setTransactions(comprehensiveData?.transactions || []);
//     } catch (error) {
//       console.error('Error fetching transactions for analytics:', error);
//       message.error('Failed to load transaction data for analytics');
//     } finally {
//       setLoading(prev => ({ ...prev, analytics: false }));
//     }
//   }, []);

//   // NEW: Fetch credits data for cashier analytics
//   const fetchCredits = useCallback(async () => {
//     try {
//       const creditsData = await creditAPI.getAll();
//       setCredits(creditsData?.data || creditsData || []);
//     } catch (error) {
//       console.error('Error fetching credits data:', error);
//       message.warning('Failed to load credit data for analytics');
//     }
//   }, []);

//   useEffect(() => {
//     fetchCashiers();
//     if (activeTab === 'performance') {
//       fetchTransactions();
//       fetchCredits(); // NEW: Fetch credits when analytics tab is active
//     }
//   }, [fetchCashiers, activeTab, fetchTransactions, fetchCredits]);

//   const handleApiError = (error, defaultMessage) => {
//     let errorMessage = defaultMessage;
    
//     if (error.response) {
//       errorMessage = error.response.data?.error || 
//                    error.response.data?.message || 
//                    `Server error: ${error.response.status}`;
//     } else if (error.request) {
//       errorMessage = 'No response from server. Please check your connection.';
//     } else {
//       errorMessage = error.message;
//     }
    
//     message.error(errorMessage);
//     console.error('API Error Details:', error);
//   };

//   const handleAddCashier = () => {
//     if (connectionError) {
//       message.error('Cannot connect to server. Please check if the backend is running.');
//       return;
//     }
    
//     form.resetFields();
//     setEditingCashier(null);
//     setIsModalVisible(true);
//   };

//   const handleEditCashier = (cashier) => {
//     form.setFieldsValue({
//       name: cashier.name,
//       email: cashier.email,
//       phone: cashier.phone
//     });
//     setEditingCashier(cashier);
//     setIsModalVisible(true);
//   };

//   const handleViewCashier = (cashier) => {
//     setEditingCashier(cashier);
//     setIsViewModalVisible(true);
//   };

//   const handleViewAnalytics = (cashier) => {
//     setSelectedCashier(cashier);
//     setActiveTab('performance');
//     // Fetch fresh data when viewing analytics
//     fetchTransactions();
//     fetchCredits();
//   };

//   const handleSubmit = async (values) => {
//     try {
//       setLoading(prev => ({ ...prev, form: true }));
      
//       const processedValues = {
//         name: values.name.trim(),
//         email: values.email.toLowerCase().trim(),
//         phone: values.phone,
//         ...(editingCashier ? {} : { password: values.password })
//       };

//       const api = createApiInstance();
      
//       if (editingCashier) {
//         const response = await api.patch(`/api/cashiers/${editingCashier._id}`, processedValues);
        
//         if (response.data.success) {
//           message.success('Cashier updated successfully');
//           setIsModalVisible(false);
//           fetchCashiers(true);
//         } else {
//           message.error(response.data.message || 'Failed to update cashier');
//         }
//       } else {
//         const response = await api.post('/api/cashiers', processedValues);
        
//         if (response.data.success) {
//           message.success('Cashier added successfully');
//           setIsModalVisible(false);
//           fetchCashiers(true);
//         } else {
//           message.error(response.data.message || 'Failed to add cashier');
//         }
//       }
//     } catch (error) {
//       if (error.response && error.response.status === 400 && 
//           error.response.data.error && error.response.data.error.includes('email')) {
//         message.error('Cashier with this email already exists');
//       } else {
//         handleApiError(error, editingCashier ? 'Failed to update cashier' : 'Failed to add cashier');
//       }
//     } finally {
//       setLoading(prev => ({ ...prev, form: false }));
//     }
//   };

//   const handleDeleteCashier = async (id) => {
//     confirm({
//       title: 'Are you sure you want to delete this cashier?',
//       content: 'This action cannot be undone.',
//       okText: 'Yes, delete',
//       okType: 'danger',
//       cancelText: 'No',
//       onOk: async () => {
//         try {
//           setLoading(prev => ({ ...prev, action: true }));
//           const api = createApiInstance();
//           await api.delete(`/api/cashiers/${id}`);
//           message.success('Cashier deleted successfully');
//           fetchCashiers(true);
//         } catch (error) {
//           handleApiError(error, 'Failed to delete cashier');
//         } finally {
//           setLoading(prev => ({ ...prev, action: false }));
//         }
//       }
//     });
//   };

//   const retryConnection = () => {
//     setConnectionError(false);
//     fetchCashiers(true);
//     if (activeTab === 'performance') {
//       fetchTransactions();
//       fetchCredits();
//     }
//   };

//   // Enhanced columns with analytics action
//   const columns = [
//     { 
//       title: 'Name', 
//       dataIndex: 'name', 
//       key: 'name',
//       sorter: (a, b) => a.name.localeCompare(b.name),
//       render: (name, record) => (
//         <Space>
//           <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
//             {name?.charAt(0)?.toUpperCase()}
//           </Avatar>
//           <Text strong>{name}</Text>
//         </Space>
//       )
//     },
//     { 
//       title: 'Email', 
//       dataIndex: 'email', 
//       key: 'email',
//       sorter: (a, b) => a.email.localeCompare(b.email)
//     },
//     { 
//       title: 'Phone', 
//       dataIndex: 'phone', 
//       key: 'phone',
//       sorter: (a, b) => a.phone?.localeCompare(b.phone || '')
//     },
//     { 
//       title: 'Status', 
//       dataIndex: 'status', 
//       key: 'status',
//       render: (status) => (
//         <Tag color={status === 'active' ? 'green' : 'red'}>
//           {status?.toUpperCase()}
//         </Tag>
//       )
//     },
//     { 
//       title: 'Last Login', 
//       dataIndex: 'lastLogin', 
//       key: 'lastLogin',
//       render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Never',
//       sorter: (a, b) => new Date(a.lastLogin || 0) - new Date(b.lastLogin || 0)
//     },
//     { 
//       title: 'Actions', 
//       key: 'actions',
//       width: 300,
//       render: (_, record) => (
//         <Space size="small">
//           <Tooltip title="View Analytics">
//             <Button 
//               type="primary" 
//               size="small"
//               icon={<BarChartOutlined />}
//               onClick={() => handleViewAnalytics(record)}
//               disabled={loading.action || connectionError}
//             >
//               Analytics
//             </Button>
//           </Tooltip>
//           <Button 
//             type="default" 
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleViewCashier(record)}
//             disabled={loading.action || connectionError}
//           >
//             View
//           </Button>
//           <Button 
//             type="default" 
//             size="small"
//             icon={<EditOutlined />}
//             onClick={() => handleEditCashier(record)}
//             disabled={loading.action || connectionError}
//           >
//             Edit
//           </Button>
//           <Button 
//             type="primary" 
//             danger
//             size="small"
//             icon={<DeleteOutlined />} 
//             onClick={() => handleDeleteCashier(record._id)}
//             disabled={loading.action || connectionError}
//           >
//             Delete
//           </Button>
//         </Space>
//       )
//     },
//   ];

//   return (
//     <div className="management-content">
//       <div className="table-header">
//         <Title level={2}>Cashier Management</Title>
//         <Button 
//           type="primary" 
//           icon={<UserAddOutlined />} 
//           onClick={handleAddCashier}
//           loading={loading.table}
//           disabled={connectionError}
//         >
//           Add Cashier
//         </Button>
//       </div>
      
//       {connectionError && (
//         <Alert
//           message="Connection Error"
//           description="Cannot connect to the server. Please check if the backend is running."
//           type="error"
//           showIcon
//           closable
//           onClose={() => setConnectionError(false)}
//           style={{ marginBottom: 16 }}
//           action={
//             <Button size="small" type="primary" onClick={retryConnection}>
//               Retry
//             </Button>
//           }
//         />
//       )}
      
//       <Tabs 
//         activeKey={activeTab} 
//         onChange={setActiveTab}
//         type="card"
//         style={{ marginTop: 16 }}
//       >
//         <TabPane 
//           tab={
//             <span>
//               <TeamOutlined />
//               Cashier List
//               <Badge count={cashiers.length} style={{ marginLeft: 8 }} />
//             </span>
//           } 
//           key="cashiers"
//         >
//           <Card 
//             title="Current Cashiers"
//             extra={
//               <Button 
//                 icon={<ReloadOutlined />}
//                 onClick={() => fetchCashiers(true)}
//                 loading={loading.table}
//               >
//                 Refresh
//               </Button>
//             }
//           >
//             <Table 
//               columns={columns} 
//               dataSource={cashiers} 
//               rowKey="_id"
//               pagination={{ pageSize: 10, showSizeChanger: true }}
//               bordered
//               loading={loading.table}
//               scroll={{ x: true }}
//               locale={{
//                 emptyText: connectionError ? 'Cannot connect to server' : 'No cashiers found'
//               }}
//             />
//           </Card>
//         </TabPane>

//         <TabPane 
//           tab={
//             <span>
//               <BarChartOutlined />
//               Performance Analytics
//               {selectedCashier && (
//                 <Tag color="blue" style={{ marginLeft: 8 }}>
//                   {selectedCashier.name}
//                 </Tag>
//               )}
//             </span>
//           } 
//           key="performance"
//         >
//           <Spin spinning={loading.analytics}>
//             <CashierAnalytics 
//               cashier={selectedCashier}
//               transactions={transactions}
//               credits={credits} // NEW: Pass credits data
//               loading={loading.analytics}
//             />
//           </Spin>
//         </TabPane>
//       </Tabs>

//       {/* Add/Edit Cashier Modal */}
//       <Modal
//         title={editingCashier ? "Edit Cashier" : "Add New Cashier"}
//         open={isModalVisible}
//         onCancel={() => setIsModalVisible(false)}
//         footer={null}
//         destroyOnClose
//         width={600}
//       >
//         <Form 
//           form={form}
//           onFinish={handleSubmit} 
//           layout="vertical"
//         >
//           <Form.Item 
//             name="name" 
//             label="Full Name" 
//             rules={[
//               { required: true, message: 'Please input cashier name' },
//               { min: 2, message: 'Minimum 2 characters' },
//               { max: 50, message: 'Maximum 50 characters' }
//             ]}
//           >
//             <Input placeholder="Enter cashier name" disabled={loading.form} />
//           </Form.Item>
          
//           <Form.Item 
//             name="email" 
//             label="Email" 
//             rules={[
//               { required: true, message: 'Please input email' },
//               { type: 'email', message: 'Please enter a valid email' }
//             ]}
//           >
//             <Input placeholder="Enter email" disabled={loading.form || !!editingCashier} />
//           </Form.Item>
          
//           <Form.Item 
//             name="phone" 
//             label="Phone Number" 
//             rules={[
//               { required: true, message: 'Please input phone number' },
//               { pattern: /^[0-9+\-\s()]{10,}$/, message: 'Please enter a valid phone number' }
//             ]}
//           >
//             <Input placeholder="Enter phone number" disabled={loading.form} />
//           </Form.Item>
          
//           {!editingCashier && (
//             <Form.Item 
//               name="password" 
//               label="Password" 
//               rules={[
//                 { required: true, message: 'Please input password' },
//                 { min: 6, message: 'Password must be at least 6 characters' }
//               ]}
//               extra="Admin sets permanent password for cashier"
//             >
//               <Input.Password placeholder="Enter password" disabled={loading.form} />
//             </Form.Item>
//           )}
          
//           <div style={{ textAlign: 'right' }}>
//             <Button 
//               onClick={() => setIsModalVisible(false)} 
//               style={{ marginRight: 8 }}
//               disabled={loading.form}
//             >
//               Cancel
//             </Button>
//             <Button 
//               type="primary" 
//               htmlType="submit"
//               loading={loading.form}
//             >
//               {editingCashier ? 'Update Cashier' : 'Add Cashier'}
//             </Button>
//           </div>
//         </Form>
//       </Modal>

//       {/* View Cashier Modal */}
//       <Modal
//         title="Cashier Details"
//         open={isViewModalVisible}
//         onCancel={() => setIsViewModalVisible(false)}
//         footer={[
//           <Button key="close" onClick={() => setIsViewModalVisible(false)}>
//             Close
//           </Button>
//         ]}
//         width={500}
//       >
//         {editingCashier && (
//           <div>
//             <Space direction="vertical" style={{ width: '100%' }}>
//               <div style={{ textAlign: 'center', marginBottom: 16 }}>
//                 <Avatar size={64} style={{ backgroundColor: '#1890ff', marginBottom: 8 }}>
//                   {editingCashier.name?.charAt(0)?.toUpperCase()}
//                 </Avatar>
//                 <Title level={4} style={{ margin: 0 }}>{editingCashier.name}</Title>
//                 <Text type="secondary">{editingCashier.email}</Text>
//               </div>
              
//               <Divider />
              
//               <Row gutter={16}>
//                 <Col span={12}>
//                   <Text strong>Phone:</Text>
//                   <br />
//                   <Text>{editingCashier.phone || 'Not provided'}</Text>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Status:</Text>
//                   <br />
//                   <Tag color={editingCashier.status === 'active' ? 'green' : 'red'}>
//                     {editingCashier.status?.toUpperCase()}
//                   </Tag>
//                 </Col>
//               </Row>
              
//               <Row gutter={16} style={{ marginTop: 8 }}>
//                 <Col span={12}>
//                   <Text strong>Club:</Text>
//                   <br />
//                   <Text>{editingCashier.club || 'Not assigned'}</Text>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Role:</Text>
//                   <br />
//                   <Tag color="blue">{editingCashier.role?.toUpperCase()}</Tag>
//                 </Col>
//               </Row>
              
//               {editingCashier.lastLogin && (
//                 <div style={{ marginTop: 8 }}>
//                   <Text strong>Last Login:</Text>
//                   <br />
//                   <Text>{new Date(editingCashier.lastLogin).toLocaleString()}</Text>
//                 </div>
//               )}
              
//               <div style={{ marginTop: 8 }}>
//                 <Text strong>Member Since:</Text>
//                 <br />
//                 <Text>{new Date(editingCashier.createdAt).toLocaleDateString()}</Text>
//               </div>
//             </Space>
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// };

// export default CashierManagement;



import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  message,
  Space,
  Typography,
  Card,
  Alert,
  Tabs,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  DatePicker,
  Select,
  Tooltip,
  Spin,
  Empty,
  Badge,
  Divider,
  List,
  Avatar
} from 'antd';

import { 
  UserAddOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BarChartOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CalculatorOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  ReloadOutlined,
  FilterOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import axios from 'axios';
import CashierDailyPerformance from '../../components/CashierDailyPerformance';
import { transactionAPI, creditAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Calculation utilities for analytics
const CalculationUtils = {
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  formatCurrency: (amount) => {
    const value = CalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

  getProfitColor: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    if (value > 0) return '#3f8600';
    if (value < 0) return '#cf1322';
    return '#d9d9d9';
  },

  getProfitIcon: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  },

  calculateProfit: (revenue, cost) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const costNum = CalculationUtils.safeNumber(cost);
    return revenueNum - costNum;
  },

  calculateProfitMargin: (revenue, profit) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const profitNum = CalculationUtils.safeNumber(profit);
    if (revenueNum <= 0) return 100.0;
    return (profitNum / revenueNum) * 100;
  },

  validateTransactionData: (transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return {
        _id: `fallback_${Date.now()}`,
        transactionNumber: `FALLBACK-${Date.now()}`,
        totalAmount: 0,
        cost: 0,
        profit: 0,
        profitMargin: 100.0,
        paymentMethod: 'cash',
        status: 'completed',
        customerName: 'Walk-in Customer',
        cashierName: 'Unknown Cashier',
        shop: 'Unknown Shop',
        saleDate: new Date(),
        items: [],
        itemsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    try {
      const items = transaction.items || [];
      const totalAmount = CalculationUtils.safeNumber(
        transaction.totalAmount || 
        transaction.amount || 
        items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.totalPrice || item.price), 0)
      );

      const cost = CalculationUtils.safeNumber(
        transaction.cost || 
        items.reduce((sum, item) => sum + (CalculationUtils.safeNumber(item.buyingPrice || item.costPrice) * CalculationUtils.safeNumber(item.quantity)), 0)
      );

      const profit = CalculationUtils.calculateProfit(totalAmount, cost);
      const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);

      return {
        _id: transaction._id?.toString() || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionNumber: transaction.transactionNumber || 
                          transaction.receiptNumber || 
                          transaction._id?.toString()?.substring(0, 8) || 
                          `TXN-${Date.now().toString().slice(-6)}`,
        totalAmount,
        cost,
        profit,
        profitMargin,
        paymentMethod: ['cash', 'mpesa', 'bank', 'credit', 'card'].includes(transaction.paymentMethod?.toLowerCase()) 
          ? transaction.paymentMethod.toLowerCase() 
          : 'cash',
        status: ['completed', 'pending', 'cancelled', 'refunded'].includes(transaction.status?.toLowerCase())
          ? transaction.status.toLowerCase()
          : 'completed',
        customerName: String(transaction.customerName || transaction.customer || 'Walk-in Customer').trim(),
        cashierName: String(transaction.cashierName || transaction.cashier || 'Unknown Cashier').trim(),
        shop: String(transaction.shop || transaction.shopName || transaction.shopId?.name || 'Unknown Shop').trim(),
        shopId: transaction.shopId || transaction.shop,
        saleDate: transaction.saleDate || transaction.createdAt || transaction.date || new Date(),
        items: Array.isArray(items) ? items : [],
        itemsCount: CalculationUtils.safeNumber(transaction.itemsCount || items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.quantity), 0)),
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        isCredit: transaction.paymentMethod === 'credit',
        creditStatus: transaction.creditStatus || 'pending'
      };
    } catch (error) {
      console.error('❌ Error validating transaction:', error);
      return {
        _id: `fallback_${Date.now()}`,
        transactionNumber: `FALLBACK-${Date.now()}`,
        totalAmount: 0,
        cost: 0,
        profit: 0,
        profitMargin: 100.0,
        paymentMethod: 'cash',
        status: 'completed',
        customerName: 'Walk-in Customer',
        cashierName: 'Unknown Cashier',
        shop: 'Unknown Shop',
        saleDate: new Date(),
        items: [],
        itemsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },

  processSalesData: (salesData, selectedShopId = null, creditsData = []) => {
    console.log('🔧 Processing sales data for analytics:', {
      salesCount: salesData?.length || 0,
      creditsCount: creditsData?.length || 0,
      selectedShopId
    });

    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
      console.warn('⚠️ No sales data provided or empty array');
      return { 
        salesWithProfit: [], 
        financialStats: CalculationUtils.getDefaultStats() 
      };
    }

    // Filter by shop if specified
    let filteredSales = salesData;
    if (selectedShopId && selectedShopId !== 'all') {
      filteredSales = salesData.filter(sale => {
        const saleShopId = sale.shopId || sale.shop;
        return saleShopId === selectedShopId;
      });
      console.log(`🏪 Filtered to ${filteredSales.length} transactions for shop: ${selectedShopId}`);
    }

    // Process each sale
    const salesWithProfit = filteredSales.map(sale => {
      try {
        const validatedSale = CalculationUtils.validateTransactionData(sale);
        const items = validatedSale.items || [];
        
        const itemsWithProfit = items.map(item => {
          const buyingPrice = item.buyingPrice || item.costPrice || 0;
          const quantity = Math.max(1, CalculationUtils.safeNumber(item.quantity, 1));
          const unitPrice = CalculationUtils.safeNumber(item.unitPrice || item.price);
          const totalPrice = CalculationUtils.safeNumber(item.totalPrice) || (unitPrice * quantity);
          const cost = buyingPrice * quantity;
          const profit = CalculationUtils.calculateProfit(totalPrice, cost);
          const profitMargin = CalculationUtils.calculateProfitMargin(totalPrice, profit);

          return {
            ...item,
            productName: item.productName || 'Unknown Product',
            buyingPrice: CalculationUtils.safeNumber(buyingPrice),
            cost: parseFloat(cost.toFixed(2)),
            profit: parseFloat(profit.toFixed(2)),
            profitMargin: parseFloat(profitMargin.toFixed(2)),
            quantity,
            unitPrice,
            totalPrice,
            category: item.category || '',
            barcode: item.barcode || ''
          };
        });

        const totalAmount = CalculationUtils.safeNumber(validatedSale.totalAmount) || itemsWithProfit.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalCost = itemsWithProfit.reduce((sum, item) => sum + item.cost, 0);
        const totalProfit = CalculationUtils.calculateProfit(totalAmount, totalCost);
        const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, totalProfit);
        const itemsCount = itemsWithProfit.reduce((sum, item) => sum + item.quantity, 0);

        return {
          ...validatedSale,
          items: itemsWithProfit,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          totalCost: parseFloat(totalCost.toFixed(2)),
          totalProfit: parseFloat(totalProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          itemsCount,
          displayDate: dayjs(validatedSale.saleDate).format('DD/MM/YYYY HH:mm'),
          displayAmount: CalculationUtils.formatCurrency(totalAmount),
          displayProfit: CalculationUtils.formatCurrency(totalProfit),
          displayMargin: `${profitMargin.toFixed(1)}%`,
          isCreditTransaction: validatedSale.paymentMethod === 'credit'
        };
      } catch (error) {
        console.error('❌ Error processing sale:', error, sale);
        return CalculationUtils.validateTransactionData(sale);
      }
    });

    const validSales = salesWithProfit.filter(sale => sale && sale.totalAmount > 0);
    
    // Calculate financial statistics
    const totalRevenue = validSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = validSales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalProfit = CalculationUtils.calculateProfit(totalRevenue, totalCost);
    
    // Calculate credit-specific metrics
    const creditSales = validSales.filter(sale => sale.paymentMethod === 'credit');
    const totalCreditAmount = creditSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const outstandingCredit = creditsData
      .filter(credit => credit.status !== 'paid')
      .reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.balanceDue), 0);
    
    const profitMargin = CalculationUtils.calculateProfitMargin(totalRevenue, totalProfit);
    const averageTransactionValue = validSales.length > 0 ? totalRevenue / validSales.length : 0;
    const totalItemsSold = validSales.reduce((sum, sale) => sum + sale.itemsCount, 0);

    const financialStats = {
      totalSales: validSales.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalItemsSold,
      averageTransactionValue: parseFloat(averageTransactionValue.toFixed(2)),
      totalTransactions: validSales.length,
      validSalesCount: validSales.length,
      invalidSalesCount: filteredSales.length - validSales.length,
      selectedShop: selectedShopId || 'all',
      
      // Credit metrics
      creditSalesCount: creditSales.length,
      totalCreditAmount: parseFloat(totalCreditAmount.toFixed(2)),
      outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
      
      timestamp: new Date().toISOString()
    };

    console.log('📈 Final financial stats with credit:', financialStats);
    
    return {
      salesWithProfit: validSales,
      financialStats
    };
  },

  getDefaultStats: () => ({
    totalSales: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalItemsSold: 0,
    profitMargin: 100.0,
    totalTransactions: 0,
    creditSalesCount: 0,
    totalCreditAmount: 0,
    outstandingCredit: 0,
    timestamp: new Date().toISOString()
  })
};

// Enhanced Cashier Analytics Component with Credit Support
const CashierAnalytics = ({ cashier, transactions, credits, loading }) => {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [timeRange, setTimeRange] = useState('7d');

  // Calculate cashier performance metrics with credit support
  const cashierStats = useMemo(() => {
    if (!cashier || !transactions || !Array.isArray(transactions)) {
      return getDefaultCashierStats();
    }

    // Filter transactions for this cashier
    const cashierTransactions = transactions.filter(t => 
      t.cashierName === cashier.name || t.cashierId === cashier._id
    );

    // Filter by date range
    const filteredTransactions = cashierTransactions.filter(t => {
      if (!dateRange || dateRange.length !== 2) return true;
      
      const transactionDate = dayjs(t.saleDate || t.createdAt);
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      
      return transactionDate.isAfter(startDate.subtract(1, 'day')) && transactionDate.isBefore(endDate.add(1, 'day'));
    });

    if (filteredTransactions.length === 0) {
      return getDefaultCashierStats();
    }

    // Calculate metrics
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalCost = filteredTransactions.reduce((sum, t) => sum + (t.cost || 0), 0);
    const totalProfit = CalculationUtils.calculateProfit(totalRevenue, totalCost);
    const totalTransactions = filteredTransactions.length;
    const totalItemsSold = filteredTransactions.reduce((sum, t) => sum + (t.itemsCount || 0), 0);
    
    const profitMargin = CalculationUtils.calculateProfitMargin(totalRevenue, totalProfit);

    // Credit-specific calculations
    const cashierCredits = credits?.filter(credit => 
      credit.cashierId === cashier._id || credit.cashierName === cashier.name
    ) || [];
    
    const creditSales = filteredTransactions.filter(t => t.paymentMethod === 'credit');
    const totalCreditAmount = creditSales.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const outstandingCredit = cashierCredits
      .filter(credit => credit.status !== 'paid')
      .reduce((sum, credit) => sum + (credit.balanceDue || 0), 0);

    // Daily performance
    const dailyPerformance = {};
    filteredTransactions.forEach(t => {
      const date = dayjs(t.saleDate || t.createdAt).format('YYYY-MM-DD');
      if (!dailyPerformance[date]) {
        dailyPerformance[date] = {
          date,
          revenue: 0,
          transactions: 0,
          profit: 0,
          itemsSold: 0,
          creditSales: 0,
          creditAmount: 0
        };
      }
      dailyPerformance[date].revenue += t.totalAmount || 0;
      dailyPerformance[date].transactions += 1;
      dailyPerformance[date].profit += t.profit || 0;
      dailyPerformance[date].itemsSold += t.itemsCount || 0;
      
      if (t.paymentMethod === 'credit') {
        dailyPerformance[date].creditSales += 1;
        dailyPerformance[date].creditAmount += t.totalAmount || 0;
      }
    });

    // Top products
    const productSales = {};
    filteredTransactions.forEach(t => {
      t.items?.forEach(item => {
        const productName = item.productName || 'Unknown Product';
        if (!productSales[productName]) {
          productSales[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0,
            profit: 0
          };
        }
        productSales[productName].quantity += item.quantity || 1;
        productSales[productName].revenue += item.totalPrice || 0;
        productSales[productName].profit += item.profit || 0;
      });
    });

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalTransactions,
      totalItemsSold,
      profitMargin,
      
      // Credit metrics
      creditSalesCount: creditSales.length,
      totalCreditAmount,
      outstandingCredit,
      cashierCredits,
      
      dailyPerformance: Object.values(dailyPerformance).sort((a, b) => 
        dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
      ),
      topProducts: Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      period: {
        start: dateRange[0]?.format('YYYY-MM-DD'),
        end: dateRange[1]?.format('YYYY-MM-DD')
      }
    };
  }, [cashier, transactions, credits, dateRange]);

  const getProfitColor = (profit) => {
    return profit >= 0 ? '#3f8600' : '#cf1322';
  };

  const getProfitIcon = (profit) => {
    return profit >= 0 ? <RiseOutlined /> : <FallOutlined />;
  };

  const formatCurrency = (amount) => {
    return CalculationUtils.formatCurrency(amount);
  };

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    const now = dayjs();
    let startDate;

    switch (value) {
      case 'today':
        startDate = now.startOf('day');
        break;
      case '7d':
        startDate = now.subtract(7, 'days');
        break;
      case '30d':
        startDate = now.subtract(30, 'days');
        break;
      case '90d':
        startDate = now.subtract(90, 'days');
        break;
      default:
        startDate = now.subtract(7, 'days');
    }

    setDateRange([startDate, now]);
  };

  if (!cashier) {
    return (
      <Card>
        <Empty description="Select a cashier to view analytics" />
      </Card>
    );
  }

  return (
    <div>
      {/* Header with Cashier Info and Filters */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col span={12}>
            <Space>
              <Avatar size="large" style={{ backgroundColor: '#1890ff' }}>
                {cashier.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0 }}>{cashier.name}</Title>
                <Text type="secondary">{cashier.email}</Text>
                <div>
                  <Tag color={cashier.status === 'active' ? 'green' : 'red'}>
                    {cashier.status?.toUpperCase()}
                  </Tag>
                  {cashier.club && <Tag color="blue">{cashier.club}</Tag>}
                </div>
              </div>
            </Space>
          </Col>
          <Col span={12}>
            <Space style={{ float: 'right' }}>
              <Text strong>Time Range:</Text>
              <Select 
                value={timeRange} 
                onChange={handleTimeRangeChange}
                style={{ width: 120 }}
              >
                <Option value="today">Today</Option>
                <Option value="7d">Last 7 Days</Option>
                <Option value="30d">Last 30 Days</Option>
                <Option value="90d">Last 90 Days</Option>
                <Option value="custom">Custom</Option>
              </Select>
              {timeRange === 'custom' && (
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={cashierStats.totalRevenue}
              formatter={(value) => (
                <span>KES {value?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {cashierStats.totalTransactions} transactions
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Profit"
              value={cashierStats.totalProfit}
              formatter={(value) => (
                <span>KES {value?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
              valueStyle={{ color: getProfitColor(cashierStats.totalProfit) }}
              prefix={getProfitIcon(cashierStats.totalProfit)}
            />
            <Progress 
              percent={Math.min(100, Math.max(0, cashierStats.profitMargin))}
              size="small"
              format={percent => `${(percent || 0).toFixed(1)}%`}
              status={cashierStats.profitMargin >= 0 ? 'normal' : 'exception'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Credit Sales"
              value={cashierStats.totalCreditAmount || 0}
              formatter={(value) => (
                <span>KES {value?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
              valueStyle={{ color: '#faad14' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {cashierStats.creditSalesCount || 0} credit transactions
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Outstanding Credit"
              value={cashierStats.outstandingCredit || 0}
              formatter={(value) => (
                <span>KES {value?.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
              valueStyle={{ color: '#cf1322' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Unpaid credit balance
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Detailed Analytics */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Credit Analysis */}
        <Col xs={24} lg={12}>
          <Card title="Credit Analysis" size="small">
            {cashierStats.cashierCredits && cashierStats.cashierCredits.length > 0 ? (
              <List
                dataSource={cashierStats.cashierCredits.slice(0, 5)}
                renderItem={credit => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar icon={<CreditCardOutlined />} />
                      }
                      title={
                        <Space>
                          <Text strong>{credit.customerName || 'Unknown Customer'}</Text>
                          <Tag color={credit.status === 'paid' ? 'green' : 'orange'}>
                            {credit.status?.toUpperCase()}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div>Total: {formatCurrency(credit.totalAmount)}</div>
                          <div>Paid: {formatCurrency(credit.amountPaid)}</div>
                          <div>Balance: {formatCurrency(credit.balanceDue)}</div>
                          {credit.dueDate && (
                            <div>Due: {dayjs(credit.dueDate).format('DD/MM/YYYY')}</div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No credit data available" />
            )}
          </Card>
        </Col>

        {/* Top Products */}
        <Col xs={24} lg={12}>
          <Card title="Top Selling Products" size="small">
            {cashierStats.topProducts.length > 0 ? (
              <List
                dataSource={cashierStats.topProducts}
                renderItem={(product, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#1890ff' : '#d9d9d9'}>
                          <Avatar size="small">{product.name.charAt(0).toUpperCase()}</Avatar>
                        </Badge>
                      }
                      title={product.name}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            Sold: {product.quantity} units
                          </Text>
                          <Text strong>
                            Revenue: {formatCurrency(product.revenue)}
                          </Text>
                          <Text style={{ color: getProfitColor(product.profit) }}>
                            Profit: {formatCurrency(product.profit)}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No product sales data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Daily Performance */}
      <Card title="Daily Performance" style={{ marginTop: 16 }}>
        {cashierStats.dailyPerformance.length > 0 ? (
          <List
            dataSource={cashierStats.dailyPerformance}
            renderItem={day => (
              <List.Item>
                <List.Item.Meta
                  avatar={<CalendarOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                  title={
                    <Space>
                      <Text strong>{dayjs(day.date).format('DD MMM YYYY')}</Text>
                      <Tag color="blue">{day.transactions} transactions</Tag>
                      {day.creditSales > 0 && (
                        <Tag color="orange">{day.creditSales} credit</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Row gutter={16}>
                      <Col span={6}>
                        <Text strong>Revenue: </Text>
                        <Text style={{ color: '#1890ff' }}>
                          {formatCurrency(day.revenue)}
                        </Text>
                      </Col>
                      <Col span={6}>
                        <Text strong>Profit: </Text>
                        <Text style={{ color: getProfitColor(day.profit) }}>
                          {formatCurrency(day.profit)}
                        </Text>
                      </Col>
                      <Col span={6}>
                        <Text strong>Items: </Text>
                        <Text>{day.itemsSold}</Text>
                      </Col>
                      <Col span={6}>
                        <Text strong>Credit: </Text>
                        <Text style={{ color: '#faad14' }}>
                          {formatCurrency(day.creditAmount)}
                        </Text>
                      </Col>
                    </Row>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No daily performance data available for the selected period" />
        )}
      </Card>
    </div>
  );
};

const getDefaultCashierStats = () => ({
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
  totalTransactions: 0,
  totalItemsSold: 0,
  profitMargin: 0,
  creditSalesCount: 0,
  totalCreditAmount: 0,
  outstandingCredit: 0,
  cashierCredits: [],
  dailyPerformance: [],
  topProducts: []
});

// Enhanced Cashier Management Component with Credit Support
const CashierManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [loading, setLoading] = useState({
    table: false,
    form: false,
    action: false,
    analytics: false
  });
  const [activeTab, setActiveTab] = useState('cashiers');
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [credits, setCredits] = useState([]);
  const [currentUser] = useState({
    _id: 'admin',
    role: 'admin',
    name: 'Admin User'
  });
  
  const [form] = Form.useForm();
  const cashiersCache = useRef({
    data: [],
    lastFetch: null
  });

  // Configure axios with correct base URL
  const createApiInstance = () => {
    const instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          setConnectionError(true);
          message.error('Cannot connect to server. Please check if the backend is running.');
        }
        return Promise.reject(error);
      }
    );

    return instance;
  };

  const fetchCashiers = useCallback(async (forceRefresh = false) => {
    try {
      const cacheValid = cashiersCache.current.lastFetch && 
                       (Date.now() - cashiersCache.current.lastFetch < 30000);
      
      if (cacheValid && !forceRefresh) {
        setCashiers(cashiersCache.current.data);
        return;
      }

      setLoading(prev => ({ ...prev, table: true }));
      setConnectionError(false);
      
      const api = createApiInstance();
      const response = await api.get('/api/cashiers');
      
      cashiersCache.current = {
        data: response.data.data || response.data || [],
        lastFetch: Date.now()
      };
      
      setCashiers(cashiersCache.current.data);
    } catch (error) {
      console.error('Fetch cashiers error:', error);
      
      if (cashiersCache.current.data.length > 0) {
        setCashiers(cashiersCache.current.data);
        message.warning('Using cached data - could not refresh from server');
      } else {
        handleApiError(error, 'Failed to fetch cashiers');
      }
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  }, []);

  // FIXED: Fetch transactions for analytics using correct API method
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, analytics: true }));
      console.log('🔄 Fetching transactions for analytics...');
      
      // Use getAll instead of getComprehensiveData which doesn't exist
      const transactionsData = await transactionAPI.getAll();
      console.log('✅ Transactions received:', transactionsData?.length || 0);
      
      // Process the transactions data
      const processedData = CalculationUtils.processSalesData(transactionsData || []);
      setTransactions(processedData.salesWithProfit || []);
      
    } catch (error) {
      console.error('❌ Error fetching transactions for analytics:', error);
      message.error('Failed to load transaction data for analytics');
      setTransactions([]);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  }, []);

  // FIXED: Fetch credits data with proper error handling
  const fetchCredits = useCallback(async () => {
    try {
      console.log('🔄 Fetching credits data...');
      const creditsData = await creditAPI.getAll();
      
      // Handle different response formats
      let creditsArray = [];
      if (Array.isArray(creditsData)) {
        creditsArray = creditsData;
      } else if (creditsData && Array.isArray(creditsData.data)) {
        creditsArray = creditsData.data;
      } else if (creditsData && creditsData.success && Array.isArray(creditsData.data)) {
        creditsArray = creditsData.data;
      }
      
      console.log('✅ Credits received:', creditsArray.length);
      setCredits(creditsArray);
    } catch (error) {
      console.error('❌ Error fetching credits data:', error);
      message.warning('Failed to load credit data for analytics');
      setCredits([]);
    }
  }, []);

  useEffect(() => {
    fetchCashiers();
  }, [fetchCashiers]);

  // Fetch analytics data when tab changes
  useEffect(() => {
    if (activeTab === 'performance' && selectedCashier) {
      console.log('📊 Loading analytics data for cashier:', selectedCashier.name);
      fetchTransactions();
      fetchCredits();
    }
  }, [activeTab, selectedCashier, fetchTransactions, fetchCredits]);

  const handleApiError = (error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response) {
      errorMessage = error.response.data?.error || 
                   error.response.data?.message || 
                   `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      errorMessage = error.message;
    }
    
    message.error(errorMessage);
    console.error('API Error Details:', error);
  };

  const handleAddCashier = () => {
    if (connectionError) {
      message.error('Cannot connect to server. Please check if the backend is running.');
      return;
    }
    
    form.resetFields();
    setEditingCashier(null);
    setIsModalVisible(true);
  };

  const handleEditCashier = (cashier) => {
    form.setFieldsValue({
      name: cashier.name,
      email: cashier.email,
      phone: cashier.phone
    });
    setEditingCashier(cashier);
    setIsModalVisible(true);
  };

  const handleViewCashier = (cashier) => {
    setEditingCashier(cashier);
    setIsViewModalVisible(true);
  };

  const handleViewAnalytics = (cashier) => {
    setSelectedCashier(cashier);
    setActiveTab('performance');
    // Fetch fresh data when viewing analytics
    console.log('🔍 Viewing analytics for cashier:', cashier.name);
    fetchTransactions();
    fetchCredits();
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(prev => ({ ...prev, form: true }));
      
      const processedValues = {
        name: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        phone: values.phone,
        ...(editingCashier ? {} : { password: values.password })
      };

      const api = createApiInstance();
      
      if (editingCashier) {
        const response = await api.patch(`/api/cashiers/${editingCashier._id}`, processedValues);
        
        if (response.data.success) {
          message.success('Cashier updated successfully');
          setIsModalVisible(false);
          fetchCashiers(true);
        } else {
          message.error(response.data.message || 'Failed to update cashier');
        }
      } else {
        const response = await api.post('/api/cashiers', processedValues);
        
        if (response.data.success) {
          message.success('Cashier added successfully');
          setIsModalVisible(false);
          fetchCashiers(true);
        } else {
          message.error(response.data.message || 'Failed to add cashier');
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 400 && 
          error.response.data.error && error.response.data.error.includes('email')) {
        message.error('Cashier with this email already exists');
      } else {
        handleApiError(error, editingCashier ? 'Failed to update cashier' : 'Failed to add cashier');
      }
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleDeleteCashier = async (id) => {
    confirm({
      title: 'Are you sure you want to delete this cashier?',
      content: 'This action cannot be undone.',
      okText: 'Yes, delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          setLoading(prev => ({ ...prev, action: true }));
          const api = createApiInstance();
          await api.delete(`/api/cashiers/${id}`);
          message.success('Cashier deleted successfully');
          fetchCashiers(true);
        } catch (error) {
          handleApiError(error, 'Failed to delete cashier');
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      }
    });
  };

  const retryConnection = () => {
    setConnectionError(false);
    fetchCashiers(true);
    if (activeTab === 'performance') {
      fetchTransactions();
      fetchCredits();
    }
  };

  // Enhanced columns with analytics action
  const columns = [
    { 
      title: 'Name', 
      dataIndex: 'name', 
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
            {name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Text strong>{name}</Text>
        </Space>
      )
    },
    { 
      title: 'Email', 
      dataIndex: 'email', 
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email)
    },
    { 
      title: 'Phone', 
      dataIndex: 'phone', 
      key: 'phone',
      sorter: (a, b) => a.phone?.localeCompare(b.phone || '')
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    { 
      title: 'Last Login', 
      dataIndex: 'lastLogin', 
      key: 'lastLogin',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Never',
      sorter: (a, b) => new Date(a.lastLogin || 0) - new Date(b.lastLogin || 0)
    },
    { 
      title: 'Actions', 
      key: 'actions',
      width: 300,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Analytics">
            <Button 
              type="primary" 
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => handleViewAnalytics(record)}
              disabled={loading.action || connectionError}
            >
              Analytics
            </Button>
          </Tooltip>
          <Button 
            type="default" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewCashier(record)}
            disabled={loading.action || connectionError}
          >
            View
          </Button>
          <Button 
            type="default" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCashier(record)}
            disabled={loading.action || connectionError}
          >
            Edit
          </Button>
          <Button 
            type="primary" 
            danger
            size="small"
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteCashier(record._id)}
            disabled={loading.action || connectionError}
          >
            Delete
          </Button>
        </Space>
      )
    },
  ];

  return (
    <div className="management-content">
      <div className="table-header">
        <Title level={2}>Cashier Management</Title>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={handleAddCashier}
          loading={loading.table}
          disabled={connectionError}
        >
          Add Cashier
        </Button>
      </div>
      
      {connectionError && (
        <Alert
          message="Connection Error"
          description="Cannot connect to the server. Please check if the backend is running."
          type="error"
          showIcon
          closable
          onClose={() => setConnectionError(false)}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={retryConnection}>
              Retry
            </Button>
          }
        />
      )}
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        style={{ marginTop: 16 }}
      >
        <TabPane 
          tab={
            <span>
              <TeamOutlined />
              Cashier List
              <Badge count={cashiers.length} style={{ marginLeft: 8 }} />
            </span>
          } 
          key="cashiers"
        >
          <Card 
            title="Current Cashiers"
            extra={
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => fetchCashiers(true)}
                loading={loading.table}
              >
                Refresh
              </Button>
            }
          >
            <Table 
              columns={columns} 
              dataSource={cashiers} 
              rowKey="_id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              bordered
              loading={loading.table}
              scroll={{ x: true }}
              locale={{
                emptyText: connectionError ? 'Cannot connect to server' : 'No cashiers found'
              }}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Performance Analytics
              {selectedCashier && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {selectedCashier.name}
                </Tag>
              )}
            </span>
          } 
          key="performance"
        >
          <Spin spinning={loading.analytics}>
            <CashierAnalytics 
              cashier={selectedCashier}
              transactions={transactions}
              credits={credits}
              loading={loading.analytics}
            />
          </Spin>
        </TabPane>
      </Tabs>

      {/* Add/Edit Cashier Modal */}
      <Modal
        title={editingCashier ? "Edit Cashier" : "Add New Cashier"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form 
          form={form}
          onFinish={handleSubmit} 
          layout="vertical"
        >
          <Form.Item 
            name="name" 
            label="Full Name" 
            rules={[
              { required: true, message: 'Please input cashier name' },
              { min: 2, message: 'Minimum 2 characters' },
              { max: 50, message: 'Maximum 50 characters' }
            ]}
          >
            <Input placeholder="Enter cashier name" disabled={loading.form} />
          </Form.Item>
          
          <Form.Item 
            name="email" 
            label="Email" 
            rules={[
              { required: true, message: 'Please input email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter email" disabled={loading.form || !!editingCashier} />
          </Form.Item>
          
          <Form.Item 
            name="phone" 
            label="Phone Number" 
            rules={[
              { required: true, message: 'Please input phone number' },
              { pattern: /^[0-9+\-\s()]{10,}$/, message: 'Please enter a valid phone number' }
            ]}
          >
            <Input placeholder="Enter phone number" disabled={loading.form} />
          </Form.Item>
          
          {!editingCashier && (
            <Form.Item 
              name="password" 
              label="Password" 
              rules={[
                { required: true, message: 'Please input password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
              extra="Admin sets permanent password for cashier"
            >
              <Input.Password placeholder="Enter password" disabled={loading.form} />
            </Form.Item>
          )}
          
          <div style={{ textAlign: 'right' }}>
            <Button 
              onClick={() => setIsModalVisible(false)} 
              style={{ marginRight: 8 }}
              disabled={loading.form}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading.form}
            >
              {editingCashier ? 'Update Cashier' : 'Add Cashier'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Cashier Modal */}
      <Modal
        title="Cashier Details"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={500}
      >
        {editingCashier && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Avatar size={64} style={{ backgroundColor: '#1890ff', marginBottom: 8 }}>
                  {editingCashier.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Title level={4} style={{ margin: 0 }}>{editingCashier.name}</Title>
                <Text type="secondary">{editingCashier.email}</Text>
              </div>
              
              <Divider />
              
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Phone:</Text>
                  <br />
                  <Text>{editingCashier.phone || 'Not provided'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Status:</Text>
                  <br />
                  <Tag color={editingCashier.status === 'active' ? 'green' : 'red'}>
                    {editingCashier.status?.toUpperCase()}
                  </Tag>
                </Col>
              </Row>
              
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Text strong>Club:</Text>
                  <br />
                  <Text>{editingCashier.club || 'Not assigned'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Role:</Text>
                  <br />
                  <Tag color="blue">{editingCashier.role?.toUpperCase()}</Tag>
                </Col>
              </Row>
              
              {editingCashier.lastLogin && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>Last Login:</Text>
                  <br />
                  <Text>{new Date(editingCashier.lastLogin).toLocaleString()}</Text>
                </div>
              )}
              
              <div style={{ marginTop: 8 }}>
                <Text strong>Member Since:</Text>
                <br />
                <Text>{new Date(editingCashier.createdAt).toLocaleDateString()}</Text>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashierManagement;