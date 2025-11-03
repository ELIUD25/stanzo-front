// src/pages/Admin/ShopManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  message, 
  Card, 
  Spin, 
  Form, 
  Input, 
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Tabs,
  Select,
  DatePicker,
  List,
  Divider,
  Descriptions,
  Tooltip,
  Badge,
  Progress,
  Alert,
  Typography
} from 'antd';
import { 
  ShopOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BarChartOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  CreditCardOutlined,
  LineChartOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  ProductOutlined,
  WarningOutlined,
  MoneyCollectOutlined,
  CalculatorOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ShopManagement = () => {
  const [shops, setShops] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [viewingShop, setViewingShop] = useState(null);
  const [shopPerformance, setShopPerformance] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [credits, setCredits] = useState([]);
  const [allCredits, setAllCredits] = useState([]);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('daily');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [form] = Form.useForm();

  // Enhanced API configuration with interceptors
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add request interceptor for debugging
  api.interceptors.request.use(request => {
    console.log('🚀 API Request:', {
      url: request.url,
      method: request.method,
      params: request.params,
      data: request.data
    });
    return request;
  });

  // Add response interceptor for debugging
  api.interceptors.response.use(response => {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  }, error => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    return Promise.reject(error);
  });

  const fetchShops = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/shops');
      setShops(response.data.data || response.data);
    } catch (error) {
      console.error('Fetch shops error:', error);
      message.error(error.response?.data?.error || 'Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopPerformance = async (shopId, period = 'daily', dateRange = null) => {
    try {
      const params = { period };
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await api.get(`/api/transactions/shop-performance/${shopId}`, { params });
      setShopPerformance(response.data.data || {});
    } catch (error) {
      console.error('Fetch shop performance error:', error);
      message.error('Failed to fetch shop performance data');
    }
  };

  const fetchShopTransactions = async (shopId, period = 'daily', dateRange = null) => {
    setTransactionsLoading(true);
    try {
      const params = { period, shopId };
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await api.get('/api/transactions', { params });
      setTransactions(response.data.data || response.data || []);
    } catch (error) {
      console.error('Fetch transactions error:', error);
      message.error('Failed to fetch transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // FIXED: Enhanced fetchShopCredits function
  const fetchShopCredits = async (shopId, period = 'daily', dateRange = null) => {
    setCreditsLoading(true);
    try {
      const params = { shopId }; // Ensure shopId is passed to filter credits by shop
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await api.get('/api/credits', { params });
      const creditsData = response.data.data || response.data || [];
      
      console.log('📊 Credits data received:', {
        totalCredits: creditsData.length,
        shopId,
        credits: creditsData.map(c => ({
          id: c._id,
          customer: c.customerName,
          amount: c.totalAmount,
          balance: c.balanceDue,
          shop: c.shop
        }))
      });
      
      // Store ALL credits for Credit Given calculation
      setAllCredits(creditsData);
      
      // Enhanced filtering for outstanding credits
      const outstandingCredits = creditsData.filter(credit => {
        const balanceDue = CalculationUtils.safeNumber(credit.balanceDue);
        const totalAmount = CalculationUtils.safeNumber(credit.totalAmount);
        const amountPaid = CalculationUtils.safeNumber(credit.amountPaid);
        
        // Consider credit as outstanding if:
        // 1. Balance due is greater than 0, OR
        // 2. Amount paid is less than total amount, OR  
        // 3. Status is not 'paid'
        return balanceDue > 0 || amountPaid < totalAmount || credit.status !== 'paid';
      });
      
      setCredits(outstandingCredits);
      
      console.log('💰 Credits analysis:', {
        allCredits: creditsData.length,
        outstandingCredits: outstandingCredits.length,
        totalCreditGiven: creditsData.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.totalAmount), 0),
        totalOutstanding: outstandingCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.balanceDue), 0)
      });
      
    } catch (error) {
      console.error('❌ Fetch credits error:', error);
      message.error('Failed to fetch credit data');
      setAllCredits([]);
      setCredits([]);
    } finally {
      setCreditsLoading(false);
    }
  };

  const fetchShopProducts = async (shopId) => {
    setProductsLoading(true);
    try {
      const response = await api.get('/api/products');
      const allProducts = response.data.data || response.data || [];
      const shopProducts = allProducts.filter(product => 
        product.shop === shopId || product.shopId === shopId
      );
      setProducts(shopProducts);
    } catch (error) {
      console.error('Fetch products error:', error);
      message.error('Failed to fetch products data');
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // FIXED: Enhanced fetchShopExpenses function with shop filtering
  const fetchShopExpenses = async (shopId, period = 'daily', dateRange = null) => {
    setExpensesLoading(true);
    try {
      const params = { shopId }; // Ensure shopId is passed to filter expenses by shop
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await api.get('/api/expenses', { params });
      
      // Additional filtering on client side to ensure only shop-specific expenses
      const allExpenses = response.data.data || response.data || [];
      const shopExpenses = allExpenses.filter(expense => 
        expense.shop === shopId || expense.shopId === shopId
      );
      
      console.log('💰 Expenses data received:', {
        allExpenses: allExpenses.length,
        shopExpenses: shopExpenses.length,
        shopId
      });
      
      setExpenses(shopExpenses);
    } catch (error) {
      console.error('❌ Fetch expenses error:', error);
      message.error('Failed to fetch expenses data');
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
      if (viewingShop) {
        fetchShopPerformance(viewingShop._id, value);
        fetchShopTransactions(viewingShop._id, value);
        fetchShopCredits(viewingShop._id, value);
        fetchShopExpenses(viewingShop._id, value);
      }
    }
  };

  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dates && viewingShop) {
      fetchShopPerformance(viewingShop._id, 'custom', dates);
      fetchShopTransactions(viewingShop._id, 'custom', dates);
      fetchShopCredits(viewingShop._id, 'custom', dates);
      fetchShopExpenses(viewingShop._id, 'custom', dates);
    }
  };

  useEffect(() => { 
    fetchShops(); 
  }, []);

  const handleAddShop = () => {
    form.resetFields();
    setEditingShop(null);
    setIsModalOpen(true);
  };

  const handleEditShop = (shop) => {
    setEditingShop(shop);
    form.setFieldsValue({
      name: shop.name,
      location: shop.location,
    });
    setIsModalOpen(true);
  };

  // FIXED: Enhanced handleViewShop with better error handling
  const handleViewShop = async (shop) => {
    setViewingShop(shop);
    setLoading(true);
    
    try {
      // Use Promise.all to fetch data in parallel
      await Promise.all([
        fetchShopPerformance(shop._id, timeFilter, customDateRange),
        fetchShopTransactions(shop._id, timeFilter, customDateRange),
        fetchShopCredits(shop._id, timeFilter, customDateRange),
        fetchShopProducts(shop._id),
        fetchShopExpenses(shop._id, timeFilter, customDateRange)
      ]);
      
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading shop data:', error);
      message.error('Failed to load shop performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/api/shops/${id}`);
      setShops(shops.filter(shop => shop._id !== id));
      message.success('Shop deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      message.error(error.response?.data?.error || 'Failed to delete shop');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      if (!values.name?.trim()) {
        throw new Error('Shop name is required');
      }
      if (!values.location?.trim()) {
        throw new Error('Location is required');
      }

      const shopData = {
        name: values.name.trim(),
        location: values.location.trim(),
      };

      let response;
      if (editingShop) {
        response = await api.put(`/api/shops/${editingShop._id}`, shopData);
        setShops(shops.map(s => s._id === editingShop._id ? response.data.data : s));
        message.success('Shop updated successfully');
      } else {
        response = await api.post('/api/shops', shopData);
        setShops([...shops, response.data.data || response.data]);
        message.success('Shop added successfully');
      }
      
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to save shop. Please check your data.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced calculation utilities
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

    calculateCOGS: () => {
      let totalCOGS = 0;
      transactions.forEach(transaction => {
        transaction.items?.forEach(item => {
          const buyingPrice = CalculationUtils.safeNumber(item.buyingPrice || item.costPrice || 0);
          const quantity = CalculationUtils.safeNumber(item.quantity, 1);
          totalCOGS += buyingPrice * quantity;
        });
      });
      return totalCOGS;
    }
  };

  // Calculate comprehensive performance metrics
  const calculatePerformanceMetrics = () => {
    // Revenue calculations
    const totalRevenue = CalculationUtils.safeNumber(shopPerformance.totalRevenue);
    const cashSales = transactions
      .filter(t => t.paymentMethod === 'cash' || t.paymentMethod === 'cash_bank_mpesa')
      .reduce((sum, t) => sum + CalculationUtils.safeNumber(t.totalAmount), 0);
    
    const creditSales = transactions
      .filter(t => t.paymentMethod === 'credit')
      .reduce((sum, t) => sum + CalculationUtils.safeNumber(t.totalAmount), 0);

    // UPDATED: Credit statistics - Calculate Credit Given from ALL credits
    const creditGiven = allCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.totalAmount), 0);
    
    // Outstanding credit from filtered credits (only unpaid/partially paid)
    const outstandingCredit = credits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.balanceDue), 0);
    
    const totalAmountPaid = allCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.amountPaid), 0);
    
    const overdueCredits = credits.filter(c => 
      c.dueDate && new Date(c.dueDate) < new Date() && CalculationUtils.safeNumber(c.balanceDue) > 0
    ).length;

    const collectionRate = creditGiven > 0 ? (totalAmountPaid / creditGiven) * 100 : 0;

    // Expense calculations
    const totalExpenses = expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0);

    // COGS calculation
    const totalCOGS = CalculationUtils.calculateCOGS();

    // Profit calculations
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Product statistics
    const lowStockProducts = products.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    );

    // Transaction statistics
    const totalSales = transactions.length;
    const totalItemsSold = transactions.reduce((sum, t) => sum + CalculationUtils.safeNumber(t.itemsCount), 0);

    return {
      // Sales metrics
      totalSales,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      cashSales: parseFloat(cashSales.toFixed(2)),
      creditSales: parseFloat(creditSales.toFixed(2)),
      totalItemsSold,
      
      // Financial metrics
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      
      // UPDATED: Credit metrics - Now properly showing both Credit Given and Outstanding Credit
      creditGiven: parseFloat(creditGiven.toFixed(2)),
      outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
      totalAmountPaid: parseFloat(totalAmountPaid.toFixed(2)),
      totalCredits: allCredits.length,
      activeCredits: credits.length,
      overdueCredits,
      collectionRate: parseFloat(collectionRate.toFixed(2)),
      
      // Product metrics
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length
    };
  };

  // Debug component to track data flow
  const DataDebugInfo = () => (
    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
      <Title level={5}>📊 Data Debug Info</Title>
      <Row gutter={[16, 8]}>
        <Col span={6}>
          <Text strong>Transactions:</Text> {transactions.length}
        </Col>
        <Col span={6}>
          <Text strong>All Credits:</Text> {allCredits.length}
        </Col>
        <Col span={6}>
          <Text strong>Outstanding Credits:</Text> {credits.length}
        </Col>
        <Col span={6}>
          <Text strong>Expenses:</Text> {expenses.length}
        </Col>
      </Row>
      <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
        <Col span={12}>
          <Text strong>Credit Given:</Text> {CalculationUtils.formatCurrency(
            allCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.totalAmount), 0)
          )}
        </Col>
        <Col span={12}>
          <Text strong>Outstanding:</Text> {CalculationUtils.formatCurrency(
            credits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.balanceDue), 0)
          )}
        </Col>
      </Row>
    </Card>
  );

  const columns = [
    { 
      title: 'Shop Name', 
      dataIndex: 'name', 
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    { 
      title: 'Location', 
      dataIndex: 'location', 
      key: 'location',
      sorter: (a, b) => a.location.localeCompare(b.location),
    },
    { 
      title: 'Status', 
      key: 'status',
      render: (_, record) => (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          Active
        </Tag>
      )
    },
    { 
      title: 'Action', 
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => handleViewShop(record)}
            type="primary"
            size="small"
          >
            View Performance
          </Button>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEditShop(record)}
            size="small"
          />
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteShop(record._id)}
            size="small"
          />
        </Space>
      )
    },
  ];

  const TransactionItem = ({ transaction }) => (
    <List.Item>
      <div style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <strong>{transaction.items?.length || 0} items</strong>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {dayjs(transaction.saleDate || transaction.transactionDate).format('MMM D, YYYY h:mm A')}
            </div>
          </Col>
          <Col>
            <Tag color={transaction.paymentMethod === 'credit' ? 'orange' : 'green'}>
              {transaction.paymentMethod?.toUpperCase() || 'CASH'}
            </Tag>
            <div style={{ textAlign: 'right' }}>
              <strong>KES {transaction.totalAmount?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}</strong>
            </div>
          </Col>
        </Row>
        {transaction.items && (
          <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
            Items: {transaction.items.map(item => `${item.productName || item.name} (${item.quantity})`).join(', ')}
          </div>
        )}
      </div>
    </List.Item>
  );

  const CreditItem = ({ credit }) => {
    const isOverdue = credit.dueDate && new Date(credit.dueDate) < new Date() && (credit.balanceDue > 0 || credit.amountPaid < credit.totalAmount);
    const statusColor = {
      pending: 'orange',
      partially_paid: 'blue',
      paid: 'green',
      overdue: 'red'
    }[credit.status] || 'default';

    const paymentProgress = credit.totalAmount > 0 ? ((credit.amountPaid || 0) / credit.totalAmount) * 100 : 0;

    return (
      <List.Item>
        <div style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col span={16}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <div>
                  <strong>{credit.customerName}</strong>
                  {credit.customerPhone && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      <PhoneOutlined /> {credit.customerPhone}
                    </Text>
                  )}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  Due: {dayjs(credit.dueDate).format('MMM D, YYYY')}
                  {isOverdue && <Tag color="red" style={{ marginLeft: 8 }}>OVERDUE</Tag>}
                </div>
                <Progress 
                  percent={Math.min(100, paymentProgress)} 
                  size="small" 
                  status={paymentProgress >= 100 ? 'success' : isOverdue ? 'exception' : 'active'}
                  showInfo={false}
                  style={{ marginTop: 4 }}
                />
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Paid: KES {(credit.amountPaid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })} / 
                  Total: KES {(credit.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" align="end" style={{ width: '100%' }}>
                <Tag color={statusColor}>
                  {credit.status?.replace('_', ' ').toUpperCase()}
                </Tag>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#cf1322' }}>
                    KES {(credit.balanceDue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Balance Due
                  </div>
                </div>
              </Space>
            </Col>
          </Row>
          {credit.cashierName && (
            <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
              <UserOutlined /> Cashier: {credit.cashierName}
              {credit.transactionId?.transactionNumber && (
                <span style={{ marginLeft: 12 }}>
                  Transaction: {credit.transactionId.transactionNumber}
                </span>
              )}
            </div>
          )}
        </div>
      </List.Item>
    );
  };

  const ShopPerformanceView = ({ shop }) => {
    const metrics = calculatePerformanceMetrics();

    return (
      <div>
        {/* Debug Info - Remove this component in production */}
        <DataDebugInfo />

        {/* Time Filter Controls */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <span>Filter by:</span>
            <Select value={timeFilter} onChange={handleTimeFilterChange} style={{ width: 120 }}>
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="annually">Annually</Option>
              <Option value="custom">Custom Range</Option>
            </Select>
            
            {timeFilter === 'custom' && (
              <RangePicker 
                value={customDateRange}
                onChange={handleCustomDateChange}
                format="YYYY-MM-DD"
              />
            )}
            
            <Tag icon={<CalendarOutlined />} color="blue">
              Period: {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}
            </Tag>
          </Space>
        </Card>

        {/* Credit Alert */}
        {metrics.outstandingCredit > 0 && (
          <Alert
            message="Outstanding Credit Balance"
            description={`This shop has ${CalculationUtils.formatCurrency(metrics.outstandingCredit)} in outstanding credit that needs collection.`}
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Performance Summary Section */}
        <Card title="Performance Summary" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {/* Sales Metrics */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Total Sales"
                  value={metrics.totalSales}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Cash Sales"
                  value={metrics.cashSales}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<MoneyCollectOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Credit Sales"
                  value={metrics.creditSales}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#faad14' }}
                  prefix={<CreditCardOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Total Revenue"
                  value={metrics.totalRevenue}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>

            {/* Financial Metrics */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="COGS"
                  value={metrics.totalCOGS}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#faad14' }}
                  prefix={<CalculatorOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Expenses"
                  value={metrics.totalExpenses}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Gross Profit"
                  value={metrics.grossProfit}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: CalculationUtils.getProfitColor(metrics.grossProfit) }}
                  prefix={CalculationUtils.getProfitIcon(metrics.grossProfit)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Net Profit"
                  value={metrics.netProfit}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: CalculationUtils.getProfitColor(metrics.netProfit) }}
                  prefix={CalculationUtils.getProfitIcon(metrics.netProfit)}
                />
              </Card>
            </Col>

            {/* UPDATED: Credit Metrics - Now showing both Credit Given and Outstanding Credit */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Credit Given"
                  value={metrics.creditGiven}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<CreditCardOutlined />}
                />
                <div style={{ marginTop: 4, fontSize: '11px', color: '#666', textAlign: 'center' }}>
                  Total credit provided
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Outstanding Credit"
                  value={metrics.outstandingCredit}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CreditCardOutlined />}
                />
                <div style={{ marginTop: 4, fontSize: '11px', color: '#666', textAlign: 'center' }}>
                  Unpaid balance
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Products"
                  value={metrics.totalProducts}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<ProductOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic
                  title="Low Stock"
                  value={metrics.lowStockCount}
                  valueStyle={{ 
                    color: metrics.lowStockCount > 0 ? '#cf1322' : '#3f8600'
                  }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Additional Metrics Row */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card size="small">
                <Statistic
                  title="Profit Margin"
                  value={metrics.profitMargin}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: metrics.profitMargin >= 20 ? '#3f8600' : 
                           metrics.profitMargin >= 10 ? '#faad14' : '#cf1322'
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small">
                <Statistic
                  title="Items Sold"
                  value={metrics.totalItemsSold}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<ShoppingCartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small">
                <Statistic
                  title="Credit Collection Rate"
                  value={metrics.collectionRate}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: metrics.collectionRate >= 80 ? '#3f8600' : 
                           metrics.collectionRate >= 50 ? '#faad14' : '#cf1322'
                  }}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Credit Summary Card */}
        <Card title="Credit Summary" style={{ marginBottom: 16 }} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Tag color="blue" style={{ fontSize: '14px', padding: '8px 16px' }}>
                  Total Credit Given
                </Tag>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  {CalculationUtils.formatCurrency(metrics.creditGiven)}
                </Title>
                <Text type="secondary">{metrics.totalCredits} credit transactions</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Tag color="red" style={{ fontSize: '14px', padding: '8px 16px' }}>
                  Outstanding Credit
                </Tag>
                <Title level={3} style={{ margin: 0, color: '#cf1322' }}>
                  {CalculationUtils.formatCurrency(metrics.outstandingCredit)}
                </Title>
                <Text type="secondary">{metrics.activeCredits} active credits</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Tag color="green" style={{ fontSize: '14px', padding: '8px 16px' }}>
                  Amount Collected
                </Tag>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                  {CalculationUtils.formatCurrency(metrics.totalAmountPaid)}
                </Title>
                <Text type="secondary">{metrics.collectionRate.toFixed(1)}% collection rate</Text>
              </Space>
            </Col>
          </Row>
          {metrics.overdueCredits > 0 && (
            <Alert
              message={`${metrics.overdueCredits} credits are overdue`}
              description="Immediate follow-up required for payment collection."
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {/* Alerts Section */}
        {(metrics.lowStockCount > 0) && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={24}>
              {metrics.lowStockCount > 0 && (
                <Alert
                  message={`${metrics.lowStockCount} products are low on stock`}
                  description="Some products need to be reordered to avoid stockouts."
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginBottom: 8 }}
                />
              )}
            </Col>
          </Row>
        )}

        <Tabs defaultActiveKey="overview">
          <Tabs.TabPane tab="Financial Details" key="overview">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Revenue Breakdown" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cash Sales:</span>
                      <strong style={{ color: '#52c41a' }}>
                        {CalculationUtils.formatCurrency(metrics.cashSales)}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Credit Sales:</span>
                      <strong style={{ color: '#faad14' }}>
                        {CalculationUtils.formatCurrency(metrics.creditSales)}
                      </strong>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Revenue:</span>
                      <strong style={{ color: '#1890ff' }}>
                        {CalculationUtils.formatCurrency(metrics.totalRevenue)}
                      </strong>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Profit Analysis" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gross Profit:</span>
                      <strong style={{ color: CalculationUtils.getProfitColor(metrics.grossProfit) }}>
                        {CalculationUtils.formatCurrency(metrics.grossProfit)}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Net Profit:</span>
                      <strong style={{ color: CalculationUtils.getProfitColor(metrics.netProfit) }}>
                        {CalculationUtils.formatCurrency(metrics.netProfit)}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Profit Margin:</span>
                      <strong>{metrics.profitMargin.toFixed(1)}%</strong>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="Transactions" key="transactions">
            <Card 
              title={`Recent Transactions (${transactions.length})`}
              loading={transactionsLoading}
            >
              {transactions.length > 0 ? (
                <List
                  dataSource={transactions}
                  renderItem={transaction => <TransactionItem transaction={transaction} />}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    showTotal: (total, range) => 
                      `${range[0]}-${range[1]} of ${total} transactions`
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No transactions found for the selected period
                </div>
              )}
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <span>
                <CreditCardOutlined />
                Outstanding Credits
                <Badge 
                  count={metrics.outstandingCredit > 0 ? metrics.overdueCredits : 0} 
                  overflowCount={99} 
                  style={{ marginLeft: 8, backgroundColor: '#cf1322' }} 
                />
              </span>
            } 
            key="credits"
          >
            <Card 
              title={`Outstanding Credit Records (${credits.length})`}
              loading={creditsLoading}
              extra={
                <Space>
                  <Tag color="blue">
                    Credit Given: {CalculationUtils.formatCurrency(metrics.creditGiven)}
                  </Tag>
                  <Tag color="red">
                    Outstanding: {CalculationUtils.formatCurrency(metrics.outstandingCredit)}
                  </Tag>
                  <Tag color={metrics.collectionRate >= 80 ? 'green' : metrics.collectionRate >= 50 ? 'orange' : 'red'}>
                    Collection: {metrics.collectionRate.toFixed(1)}%
                  </Tag>
                </Space>
              }
            >
              {credits.length > 0 ? (
                <List
                  dataSource={credits}
                  renderItem={credit => <CreditItem credit={credit} />}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    showTotal: (total, range) => 
                      `${range[0]}-${range[1]} of ${total} outstanding credits`
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No outstanding credit records found for the selected period
                </div>
              )}
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Products" key="products">
            <Card 
              title={`Shop Products (${products.length})`}
              loading={productsLoading}
              extra={
                <Space>
                  <Tag color="blue">Total: {products.length}</Tag>
                  {metrics.lowStockCount > 0 && (
                    <Tag color="red">Low Stock: {metrics.lowStockCount}</Tag>
                  )}
                </Space>
              }
            >
              {products.length > 0 ? (
                <List
                  dataSource={products.slice(0, 10)}
                  renderItem={product => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<ProductOutlined />}
                        title={product.name}
                        description={
                          <Space>
                            <Tag color={product.currentStock <= (product.minStockLevel || 5) ? 'red' : 'green'}>
                              Stock: {product.currentStock}
                            </Tag>
                            <Text type="secondary">
                              Price: {CalculationUtils.formatCurrency(product.sellingPrice || product.price)}
                            </Text>
                            {product.currentStock <= (product.minStockLevel || 5) && (
                              <Tag color="red">Low Stock</Tag>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No products found for this shop
                </div>
              )}
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShopOutlined style={{ marginRight: 8 }} />
          <span>Shop Management</span>
        </div>
      } 
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddShop}>Add Shop</Button>}
    >
      <Spin spinning={loading}>
        <Table 
          columns={columns} 
          dataSource={shops} 
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
          locale={{
            emptyText: loading ? 'Loading shops...' : 'No shops found. Click "Add Shop" to create one.'
          }}
        />
      </Spin>

      {/* Add/Edit Shop Modal */}
      <Modal
        title={editingShop ? 'Edit Shop' : 'Add New Shop'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Shop Name"
            name="name"
            rules={[{ required: true, message: 'Please enter shop name' }]}
          >
            <Input placeholder="Enter shop name" />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: 'Please enter location' }]}
          >
            <Input placeholder="Enter location" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {editingShop ? 'Update Shop' : 'Add Shop'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Shop Performance Modal */}
      <Modal
        title={
          <Space>
            <BarChartOutlined />
            Shop Performance - {viewingShop?.name}
            <Tag color="blue">{viewingShop?.location}</Tag>
          </Space>
        }
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        <Spin spinning={loading}>
          {viewingShop && (
            <ShopPerformanceView shop={viewingShop} />
          )}
        </Spin>
      </Modal>
    </Card>
  );
};

export default ShopManagement;