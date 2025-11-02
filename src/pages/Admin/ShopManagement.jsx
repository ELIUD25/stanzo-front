// Enhanced ShopManagement.jsx with comprehensive performance view
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
  Divider
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
  CalendarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

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
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('daily');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [form] = Form.useForm();

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
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

  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
      if (viewingShop) {
        fetchShopPerformance(viewingShop._id, value);
        fetchShopTransactions(viewingShop._id, value);
      }
    }
  };

  const handleCustomDateChange = (dates) => {
    setCustomDateRange(dates);
    if (dates && viewingShop) {
      fetchShopPerformance(viewingShop._id, 'custom', dates);
      fetchShopTransactions(viewingShop._id, 'custom', dates);
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
    await fetchShopPerformance(shop._id, timeFilter, customDateRange);
    await fetchShopTransactions(shop._id, timeFilter, customDateRange);
    setIsViewModalOpen(true);
    setLoading(false);
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
            View
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
              {dayjs(transaction.transactionDate).format('MMM D, YYYY h:mm A')}
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
            Items: {transaction.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
          </div>
        )}
      </div>
    </List.Item>
  );

  const ShopPerformanceView = ({ shop, performance }) => (
    <div>
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

      <Tabs defaultActiveKey="overview">
        <Tabs.TabPane tab="Financial Overview" key="overview">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total Revenue"
                  value={performance.totalRevenue || 0}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total Profit"
                  value={performance.totalProfit || 0}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<LineChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Credit Given"
                  value={performance.totalCredit || 0}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: '#faad14' }}
                  prefix={<CreditCardOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Items Sold"
                  value={performance.totalItemsSold || 0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<ShoppingCartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total Transactions"
                  value={performance.totalTransactions || 0}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Profit Margin"
                  value={performance.profitMargin || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: performance.profitMargin >= 20 ? '#3f8600' : 
                           performance.profitMargin >= 10 ? '#faad14' : '#cf1322' 
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Additional Metrics */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Performance Summary" size="small">
                <Space wrap>
                  <Tag color="blue">
                    Cash Sales: KES {performance.cashRevenue?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}
                  </Tag>
                  <Tag color="orange">
                    Credit Sales: KES {performance.creditRevenue?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}
                  </Tag>
                  <Tag color={performance.profitMargin >= 15 ? 'green' : 'red'}>
                    Margin: {performance.profitMargin?.toFixed(1) || '0.0'}%
                  </Tag>
                  <Tag color={performance.totalTransactions > 10 ? 'green' : 'volcano'}>
                    Avg. Items/Transaction: {performance.averageItemsPerTransaction?.toFixed(1) || '0.0'}
                  </Tag>
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

        <Tabs.TabPane tab="Detailed Analytics" key="analytics">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Revenue Breakdown" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cash Revenue:</span>
                    <strong>KES {performance.cashRevenue?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Credit Revenue:</span>
                    <strong>KES {performance.creditRevenue?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}</strong>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Revenue:</span>
                    <strong>KES {performance.totalRevenue?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}</strong>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Performance Metrics" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Transactions Count:</span>
                    <Tag color="blue">{performance.totalTransactions || 0}</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items Sold:</span>
                    <Tag color="green">{performance.totalItemsSold || 0}</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Credit Given:</span>
                    <Tag color="orange">KES {performance.totalCredit?.toLocaleString('en-KE', { minimumFractionDigits: 2 }) || '0.00'}</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );

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
        width={1000}
        style={{ top: 20 }}
      >
        <Spin spinning={loading}>
          {viewingShop && (
            <ShopPerformanceView 
              shop={viewingShop} 
              performance={shopPerformance} 
            />
          )}
        </Spin>
      </Modal>
    </Card>
  );
};

export default ShopManagement;