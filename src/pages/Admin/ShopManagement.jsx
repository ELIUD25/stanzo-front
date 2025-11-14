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
import { shopAPI, unifiedAPI, creditAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
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
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('daily');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [form] = Form.useForm();

  const fetchShops = async () => {
    setLoading(true);
    try {
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);
    } catch (error) {
      message.error('Failed to fetch shops');
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
      
      // Use the unified API for comprehensive data
      const response = await unifiedAPI.getCombinedTransactions({
        shopId,
        ...params
      });
      
      // Extract shop-specific performance from the comprehensive data
      const shopData = response.comprehensiveReport || response;
      setShopPerformance(shopData.summary || {});
    } catch (error) {
      message.error('Failed to fetch shop performance data');
    }
  };

  const fetchShopTransactions = async (shopId, period = 'daily', dateRange = null) => {
    setTransactionsLoading(true);
    try {
      const params = { shopId, dataType: 'basic' };
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await unifiedAPI.getCombinedTransactions(params);
      const transactionsData = response.transactions || response.data?.transactions || [];
      setTransactions(transactionsData);
    } catch (error) {
      message.error('Failed to fetch transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchShopCredits = async (shopId, period = 'daily', dateRange = null) => {
    setCreditsLoading(true);
    try {
      const params = { shopId, analysisType: 'comprehensive' };
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await unifiedAPI.getCombinedCreditAnalysis(params);
      const creditsData = response.credits || response.comprehensive?.credits || [];
      
      setAllCredits(creditsData);

      const outstandingCredits = creditsData.filter(credit => {
        const balanceDue = CalculationUtils.safeNumber(credit.balanceDue);
        const totalAmount = CalculationUtils.safeNumber(credit.totalAmount);
        const amountPaid = CalculationUtils.safeNumber(credit.amountPaid);
        return balanceDue > 0 || amountPaid < totalAmount || credit.status !== 'paid';
      });

      setCredits(outstandingCredits);
    } catch (error) {
      message.error('Failed to fetch credit data');
      setAllCredits([]);
      setCredits([]);
    } finally {
      setCreditsLoading(false);
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
      }
    }
  };

  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dates && viewingShop) {
      fetchShopPerformance(viewingShop._id, 'custom', dates);
      fetchShopTransactions(viewingShop._id, 'custom', dates);
      fetchShopCredits(viewingShop._id, 'custom', dates);
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

  const handleViewShop = async (shop) => {
    setViewingShop(shop);
    setLoading(true);
    try {
      await Promise.all([
        fetchShopPerformance(shop._id, timeFilter, customDateRange),
        fetchShopTransactions(shop._id, timeFilter, customDateRange),
        fetchShopCredits(shop._id, timeFilter, customDateRange)
      ]);
      setIsViewModalOpen(true);
    } catch (error) {
      message.error('Failed to load shop performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async (id) => {
    try {
      setLoading(true);
      await shopAPI.delete(id);
      setShops(shops.filter(shop => shop._id !== id));
      message.success('Shop deleted successfully');
    } catch (error) {
      message.error('Failed to delete shop');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (!values.name?.trim() || !values.location?.trim()) {
        throw new Error('Shop name and location are required');
      }

      const shopData = { name: values.name.trim(), location: values.location.trim() };
      let response;

      if (editingShop) {
        response = await shopAPI.update(editingShop._id, shopData);
        setShops(shops.map(s => s._id === editingShop._id ? response.data : s));
        message.success('Shop updated successfully');
      } else {
        response = await shopAPI.create(shopData);
        setShops([...shops, response.data]);
        message.success('Shop added successfully');
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(error.message || 'Failed to save shop');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Calculate COGS using the available utility functions
  const calculateCOGS = (transactions) => {
    if (!Array.isArray(transactions)) return 0;
    
    return transactions.reduce((sum, transaction) => {
      // Use the enhanced cost calculation from CalculationUtils
      const cost = CalculationUtils.calculateCostFromItems(transaction);
      return sum + cost;
    }, 0);
  };

  const calculatePerformanceMetrics = () => {
    const totalRevenue = CalculationUtils.safeNumber(shopPerformance.totalRevenue);
    const creditSales = transactions
      .filter(t => t.paymentMethod === 'credit')
      .reduce((sum, t) => sum + CalculationUtils.safeNumber(t.totalAmount), 0);

    const creditGiven = allCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.totalAmount), 0);
    const outstandingCredit = credits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.balanceDue), 0);
    const totalAmountPaid = allCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.amountPaid), 0);

    // FIXED: Use the local calculateCOGS function instead of CalculationUtils.calculateCOGS
    const totalCOGS = calculateCOGS(transactions);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit; // No expenses, so Net Profit = Gross Profit

    const totalSales = transactions.length;
    const totalItemsSold = transactions.reduce((sum, t) => sum + CalculationUtils.safeNumber(t.itemsCount), 0);

    return {
      totalSales,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      creditSales: parseFloat(creditSales.toFixed(2)),
      totalItemsSold,
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      creditGiven: parseFloat(creditGiven.toFixed(2)),
      outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
      totalAmountPaid: parseFloat(totalAmountPaid.toFixed(2)),
      totalCredits: allCredits.length,
      activeCredits: credits.length
    };
  };

  const DataDebugInfo = () => (
    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
      <Title level={5}>Data Debug Info</Title>
      <Row gutter={[16, 8]}>
        <Col span={8}><Text strong>Transactions:</Text> {transactions.length}</Col>
        <Col span={8}><Text strong>All Credits:</Text> {allCredits.length}</Col>
        <Col span={8}><Text strong>Outstanding:</Text> {credits.length}</Col>
      </Row>
      <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
        <Col span={12}><Text strong>Credit Given:</Text> {CalculationUtils.formatCurrency(allCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.totalAmount), 0))}</Col>
        <Col span={12}><Text strong>Outstanding:</Text> {CalculationUtils.formatCurrency(credits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.balanceDue), 0))}</Col>
      </Row>
    </Card>
  );

  const columns = [
    { title: 'Shop Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Location', dataIndex: 'location', key: 'location', sorter: (a, b) => a.location.localeCompare(b.location) },
    { title: 'Status', key: 'status', render: () => <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag> },
    { 
      title: 'Action', 
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => handleViewShop(record)} type="primary" size="small">View Performance</Button>
          <Button icon={<EditOutlined />} onClick={() => handleEditShop(record)} size="small" />
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteShop(record._id)} size="small" />
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
    const statusColor = { pending: 'orange', partially_paid: 'blue', paid: 'green', overdue: 'red' }[credit.status] || 'default';
    const paymentProgress = credit.totalAmount > 0 ? ((credit.amountPaid || 0) / credit.totalAmount) * 100 : 0;

    return (
      <List.Item>
        <div style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col span={16}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <div>
                  <strong>{credit.customerName}</strong>
                  {credit.customerPhone && <Text type="secondary" style={{ marginLeft: 8 }}><PhoneOutlined /> {credit.customerPhone}</Text>}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  Due: {dayjs(credit.dueDate).format('MMM D, YYYY')}
                  {isOverdue && <Tag color="red" style={{ marginLeft: 8 }}>OVERDUE</Tag>}
                </div>
                <Progress percent={Math.min(100, paymentProgress)} size="small" status={paymentProgress >= 100 ? 'success' : isOverdue ? 'exception' : 'active'} showInfo={false} style={{ marginTop: 4 }} />
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Paid: KES {(credit.amountPaid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })} / Total: KES {(credit.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" align="end" style={{ width: '100%' }}>
                <Tag color={statusColor}>{credit.status?.replace('_', ' ').toUpperCase()}</Tag>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#cf1322' }}>
                    KES {(credit.balanceDue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Balance Due</div>
                </div>
              </Space>
            </Col>
          </Row>
          {credit.cashierName && (
            <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
              <UserOutlined /> Cashier: {credit.cashierName}
              {credit.transactionId?.transactionNumber && <span style={{ marginLeft: 12 }}>Transaction: {credit.transactionId.transactionNumber}</span>}
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
        <DataDebugInfo />

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
              <RangePicker value={customDateRange} onChange={handleCustomDateChange} format="YYYY-MM-DD" />
            )}
            <Tag icon={<CalendarOutlined />} color="blue">
              Period: {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}
            </Tag>
          </Space>
        </Card>

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

        <Card title="Performance Summary" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Total Sales" value={metrics.totalSales} valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Credit Sales" value={metrics.creditSales} precision={2} prefix="KES" valueStyle={{ color: '#faad14' }} prefix={<CreditCardOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Total Revenue" value={metrics.totalRevenue} precision={2} prefix="KES" valueStyle={{ color: '#1890ff' }} prefix={<DollarOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="COGS" value={metrics.totalCOGS} precision={2} prefix="KES" valueStyle={{ color: '#faad14' }} prefix={<CalculatorOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Gross Profit" value={metrics.grossProfit} precision={2} prefix="KES" valueStyle={{ color: CalculationUtils.getProfitColor(metrics.grossProfit) }} prefix={CalculationUtils.getProfitIcon(metrics.grossProfit)} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Net Profit" value={metrics.netProfit} precision={2} prefix="KES" valueStyle={{ color: CalculationUtils.getProfitColor(metrics.netProfit) }} prefix={CalculationUtils.getProfitIcon(metrics.netProfit)} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Credit Given" value={metrics.creditGiven} precision={2} prefix="KES" valueStyle={{ color: '#1890ff' }} prefix={<CreditCardOutlined />} />
                <div style={{ marginTop: 4, fontSize: '11px', color: '#666', textAlign: 'center' }}>Total credit provided</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Outstanding Credit" value={metrics.outstandingCredit} precision={2} prefix="KES" valueStyle={{ color: '#cf1322' }} prefix={<CreditCardOutlined />} />
                <div style={{ marginTop: 4, fontSize: '11px', color: '#666', textAlign: 'center' }}>Unpaid balance</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Statistic title="Amount Collected" value={metrics.totalAmountPaid} precision={2} prefix="KES" valueStyle={{ color: '#52c41a' }} prefix={<MoneyCollectOutlined />} />
                <div style={{ marginTop: 4, fontSize: '11px', color: '#666', textAlign: 'center' }}>Collected from credits</div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card size="small">
                <Statistic title="Items Sold" value={metrics.totalItemsSold} valueStyle={{ color: '#52c41a' }} prefix={<ShoppingCartOutlined />} />
              </Card>
            </Col>
          </Row>
        </Card>

        <Card title="Credit Summary" style={{ marginBottom: 16 }} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Tag color="blue" style={{ fontSize: '14px', padding: '8px 16px' }}>Total Credit Given</Tag>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>{CalculationUtils.formatCurrency(metrics.creditGiven)}</Title>
                <Text type="secondary">{metrics.totalCredits} credit transactions</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Tag color="red" style={{ fontSize: '14px', padding: '8px 16px' }}>Outstanding Credit</Tag>
                <Title level={3} style={{ margin: 0, color: '#cf1322' }}>{CalculationUtils.formatCurrency(metrics.outstandingCredit)}</Title>
                <Text type="secondary">{metrics.activeCredits} active credits</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Tag color="green" style={{ fontSize: '14px', padding: '8px 16px' }}>Amount Collected</Tag>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>{CalculationUtils.formatCurrency(metrics.totalAmountPaid)}</Title>
                <Text type="secondary">Collected from credits</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        <Tabs defaultActiveKey="overview">
          <Tabs.TabPane tab="Financial Details" key="overview">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Revenue Breakdown" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Credit Sales:</span>
                      <strong style={{ color: '#faad14' }}>{CalculationUtils.formatCurrency(metrics.creditSales)}</strong>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Revenue:</span>
                      <strong style={{ color: '#1890ff' }}>{CalculationUtils.formatCurrency(metrics.totalRevenue)}</strong>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Profit Analysis" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gross Profit:</span>
                      <strong style={{ color: CalculationUtils.getProfitColor(metrics.grossProfit) }}>{CalculationUtils.formatCurrency(metrics.grossProfit)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Net Profit:</span>
                      <strong style={{ color: CalculationUtils.getProfitColor(metrics.netProfit) }}>{CalculationUtils.formatCurrency(metrics.netProfit)}</strong>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Transactions" key="transactions">
            <Card title={`Recent Transactions (${transactions.length})`} loading={transactionsLoading}>
              {transactions.length > 0 ? (
                <List dataSource={transactions} renderItem={t => <TransactionItem transaction={t} />} pagination={{ pageSize: 10 }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No transactions found</div>
              )}
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <span>
                <CreditCardOutlined /> Outstanding Credits
                <Badge count={metrics.activeCredits} style={{ marginLeft: 8, backgroundColor: '#cf1322' }} />
              </span>
            } 
            key="credits"
          >
            <Card 
              title={`Outstanding Credit Records (${credits.length})`}
              loading={creditsLoading}
              extra={
                <Space>
                  <Tag color="blue">Given: {CalculationUtils.formatCurrency(metrics.creditGiven)}</Tag>
                  <Tag color="red">Outstanding: {CalculationUtils.formatCurrency(metrics.outstandingCredit)}</Tag>
                  <Tag color="green">Collected: {CalculationUtils.formatCurrency(metrics.totalAmountPaid)}</Tag>
                </Space>
              }
            >
              {credits.length > 0 ? (
                <List dataSource={credits} renderItem={c => <CreditItem credit={c} />} pagination={{ pageSize: 10 }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No outstanding credits</div>
              )}
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  };

  return (
    <Card 
      title={<div style={{ display: 'flex', alignItems: 'center' }}><ShopOutlined style={{ marginRight: 8 }} /><span>Shop Management</span></div>} 
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddShop}>Add Shop</Button>}
    >
      <Spin spinning={loading}>
        <Table columns={columns} dataSource={shops} rowKey="_id" pagination={{ pageSize: 10 }} scroll={{ x: true }} />
      </Spin>

      <Modal
        title={editingShop ? 'Edit Shop' : 'Add New Shop'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Shop Name" name="name" rules={[{ required: true, message: 'Please enter shop name' }]}>
            <Input placeholder="Enter shop name" />
          </Form.Item>
          <Form.Item label="Location" name="location" rules={[{ required: true, message: 'Please enter location' }]}>
            <Input placeholder="Enter location" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {editingShop ? 'Update Shop' : 'Add Shop'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><BarChartOutlined /> Shop Performance - {viewingShop?.name} <Tag color="blue">{viewingShop?.location}</Tag></Space>}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsViewModalOpen(false)}>Close</Button>]}
        width={1200}
        style={{ top: 20 }}
      >
        <Spin spinning={loading}>
          {viewingShop && <ShopPerformanceView shop={viewingShop} />}
        </Spin>
      </Modal>
    </Card>
  );
};

export default ShopManagement;