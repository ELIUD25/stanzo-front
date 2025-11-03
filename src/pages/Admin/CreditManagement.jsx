// src/components/CreditManagement.jsx - FIXED SHOP NAME DISPLAY
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Tag,
  Space,
  Typography,
  Alert,
  notification,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Tooltip,
  Badge,
  message,
  Divider,
  Descriptions
} from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  ShopOutlined,
  EditOutlined,
  SyncOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { creditAPI, shopAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const CreditManagement = ({ currentUser, shops: initialShops = [] }) => {
  const [credits, setCredits] = useState([]);
  const [shops, setShops] = useState(initialShops);
  const [loading, setLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState('all');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [dueSoonCredits, setDueSoonCredits] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch shops if not provided
  const fetchShops = async () => {
    setShopLoading(true);
    try {
      let shopsData = [];
      
      // If shops are provided via props, use them
      if (initialShops && initialShops.length > 0) {
        shopsData = initialShops;
      } else {
        // Otherwise fetch from API
        const response = await shopAPI.getAll();
        shopsData = Array.isArray(response?.data) ? response.data : 
                   Array.isArray(response) ? response : 
                   response?.shops || [];
      }
      
      setShops(shopsData);
      console.log('🏪 Shops loaded successfully:', {
        count: shopsData.length,
        shops: shopsData.map(s => ({ id: s._id, name: s.name || s.shopName }))
      });
    } catch (error) {
      console.error('Error fetching shops:', error);
      notification.warning({
        message: 'Failed to load shops',
        description: 'Shop names may not display correctly'
      });
      setShops([]);
    } finally {
      setShopLoading(false);
    }
  };

  // Safe shops array with fallback
  const safeShops = Array.isArray(shops) ? shops : [];

  // Fetch credits data
  const fetchCredits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedShop && selectedShop !== 'all') {
        params.shopId = selectedShop;
      }
      
      const response = await creditAPI.getAll(params);
      // Ensure credits is always an array
      const creditsData = Array.isArray(response?.data) ? response.data : 
                        Array.isArray(response) ? response : [];
      setCredits(creditsData);
      
      // Check for credits due in 2 days
      checkDueSoonCredits(creditsData);
      
      // Debug: Check shop data in credits
      console.log('📊 Credits loaded with shop data:', {
        creditsCount: creditsData.length,
        creditsWithShopInfo: creditsData.map(c => ({
          id: c._id,
          customer: c.customerName,
          shopId: c.shopId,
          shop: c.shop,
          shopName: c.shopName
        }))
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
      notification.error({
        message: 'Failed to load credits',
        description: error.message
      });
      // Set empty array on error
      setCredits([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment history for a credit
  const fetchPaymentHistory = async (creditId) => {
    try {
      // Since getPaymentHistory method doesn't exist, we'll use the credit data itself
      const credit = credits.find(c => c._id === creditId);
      if (credit && credit.paymentHistory) {
        setPaymentHistory(credit.paymentHistory);
      } else {
        // Fallback: create payment history from credit data
        const history = [];
        if (credit && credit.amountPaid > 0) {
          history.push({
            amount: credit.amountPaid,
            paymentDate: credit.updatedAt || credit.createdAt,
            paymentMethod: 'cash',
            recordedBy: credit.cashierName || 'System',
            cashierName: credit.cashierName || 'Unknown Cashier'
          });
        }
        setPaymentHistory(history);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      notification.error({
        message: 'Failed to load payment history',
        description: error.message
      });
      setPaymentHistory([]);
    }
  };

  // Check for credits due in 2 days and send notifications
  const checkDueSoonCredits = (creditsData) => {
    if (!Array.isArray(creditsData)) {
      setDueSoonCredits([]);
      return;
    }

    const twoDaysFromNow = dayjs().add(2, 'day');
    const dueSoon = creditsData.filter(credit => {
      if (!credit || credit.status === 'paid') return false;
      
      const dueDate = dayjs(credit.dueDate);
      if (!dueDate.isValid()) return false;
      
      const daysUntilDue = dueDate.diff(dayjs(), 'day');
      
      return daysUntilDue <= 2 && daysUntilDue >= 0;
    });

    setDueSoonCredits(dueSoon);

    // Show notification for due soon credits
    if (dueSoon.length > 0 && currentUser?.role === 'admin') {
      notification.warning({
        message: 'Credit Payment Reminder',
        description: `${dueSoon.length} credit(s) are due in 2 days or less.`,
        duration: 0, // Stays until manually closed
        btn: (
          <Button 
            type="primary" 
            size="small" 
            onClick={() => {
              notification.destroy();
            }}
          >
            View Details
          </Button>
        ),
      });
    }
  };

  // Handle credit payment
  const handlePayment = async (values) => {
    try {
      if (!selectedCredit || !selectedCredit._id) {
        notification.error({
          message: 'Error',
          description: 'No credit selected for payment'
        });
        return;
      }

      const paymentData = {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        recordedBy: currentUser?.name || 'Admin',
        cashierName: currentUser?.name || 'Unknown Cashier'
      };

      await creditAPI.patchPayment(selectedCredit._id, paymentData);
      
      notification.success({
        message: 'Payment Recorded',
        description: `Payment of ${formatCurrency(values.amount)} recorded successfully.`
      });

      setPaymentModalVisible(false);
      setSelectedCredit(null);
      paymentForm.resetFields();
      fetchCredits(); // Refresh data
    } catch (error) {
      console.error('Error recording payment:', error);
      notification.error({
        message: 'Payment Failed',
        description: error.message || 'Failed to record payment'
      });
    }
  };

  // Handle update credit record (shop and cashier assignment)
  const handleUpdateCredit = async (values) => {
    try {
      if (!selectedCredit || !selectedCredit._id) {
        notification.error({
          message: 'Error',
          description: 'No credit selected for update'
        });
        return;
      }

      const updateData = {
        shopId: values.shopId,
        cashierName: values.cashierName,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        dueDate: values.dueDate
      };

      await creditAPI.update(selectedCredit._id, updateData);
      
      notification.success({
        message: 'Credit Record Updated',
        description: 'Credit record has been updated successfully.'
      });

      setEditModalVisible(false);
      setSelectedCredit(null);
      editForm.resetFields();
      fetchCredits(); // Refresh data
    } catch (error) {
      console.error('Error updating credit:', error);
      notification.error({
        message: 'Update Failed',
        description: error.message || 'Failed to update credit record'
      });
    }
  };

  // Handle delete credit record - FIXED
  const handleDeleteCredit = async (creditId) => {
    try {
      console.log('🗑️ Attempting to delete credit:', creditId);
      
      // Use the correct delete method from creditAPI
      const response = await creditAPI.delete(creditId);
      
      console.log('✅ Delete response:', response);
      
      notification.success({
        message: 'Credit Record Deleted',
        description: 'Credit record has been deleted successfully.'
      });

      fetchCredits(); // Refresh data
    } catch (error) {
      console.error('❌ Error deleting credit:', error);
      
      let errorMessage = 'Failed to delete credit record';
      
      if (error.response?.status === 404) {
        errorMessage = 'Credit record not found. It may have already been deleted.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notification.error({
        message: 'Delete Failed',
        description: errorMessage
      });
    }
  };

  // Calculate credit statistics
  const calculateStats = () => {
    if (!Array.isArray(credits)) {
      return {
        totalPending: 0,
        totalPartiallyPaid: 0,
        totalOverdue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalCollected: 0,
        totalCredits: 0
      };
    }

    const totalPending = credits.filter(c => c && c.status === 'pending').length;
    const totalPartiallyPaid = credits.filter(c => c && c.status === 'partially_paid').length;
    const totalOverdue = credits.filter(c => c && c.status === 'overdue').length;
    const totalPaid = credits.filter(c => c && c.status === 'paid').length;
    
    const totalOutstanding = credits
      .filter(c => c && c.status !== 'paid')
      .reduce((sum, credit) => sum + (credit.balanceDue || 0), 0);

    const totalCollected = credits
      .filter(c => c && c.status === 'paid')
      .reduce((sum, credit) => sum + (credit.amountPaid || 0), 0);

    return {
      totalPending,
      totalPartiallyPaid,
      totalOverdue,
      totalPaid,
      totalOutstanding,
      totalCollected,
      totalCredits: credits.length
    };
  };

  // Filter credits based on search and status
  const filteredCredits = credits.filter(credit => {
    if (!credit) return false;
    
    const matchesSearch = !searchTerm || 
      credit.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.customerPhone?.includes(searchTerm) ||
      (credit.transactionId?.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      credit._id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || credit.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = calculateStats();

  // Safe data formatting functions
  const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `KES ${value.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return dayjs(date).format('DD/MM/YYYY HH:mm');
  };

  const getStatusConfig = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: 'Pending', icon: <ClockCircleOutlined /> },
      partially_paid: { color: 'blue', text: 'Partially Paid', icon: <DollarOutlined /> },
      paid: { color: 'green', text: 'Paid', icon: <CheckCircleOutlined /> },
      overdue: { color: 'red', text: 'Overdue', icon: <ExclamationCircleOutlined /> }
    };
    
    return statusConfig[status] || statusConfig.pending;
  };

  // ✅ FIXED: Enhanced Get shop name with better debugging
  const getShopName = (credit) => {
    if (!credit) {
      console.log('❌ No credit provided to getShopName');
      return 'Unknown Shop';
    }
    
    const debugInfo = {
      creditId: credit._id,
      customer: credit.customerName,
      shopId: credit.shopId,
      shop: credit.shop,
      shopName: credit.shopName,
      availableShops: safeShops.length,
      shopIds: safeShops.map(s => s._id)
    };

    console.log('🔍 getShopName debug:', debugInfo);

    // Priority 1: Direct shopName field in credit
    if (credit.shopName && credit.shopName !== 'Unknown Shop') {
      console.log('✅ Using direct shopName from credit:', credit.shopName);
      return credit.shopName;
    }

    // Priority 2: Look up shop from shops list using shop ID
    if (credit.shopId) {
      const foundShop = safeShops.find(s => s._id === credit.shopId);
      if (foundShop) {
        const shopName = foundShop.name || foundShop.shopName;
        console.log('✅ Found shop by shopId:', { shopId: credit.shopId, shopName });
        return shopName || 'Unknown Shop';
      } else {
        console.log('❌ No shop found for shopId:', credit.shopId);
      }
    }
    
    // Priority 3: Direct shop field (string) - check if it's a shop ID or name
    if (credit.shop && typeof credit.shop === 'string') {
      // First check if this string is a shop ID by looking it up
      const foundShop = safeShops.find(s => s._id === credit.shop);
      if (foundShop) {
        const shopName = foundShop.name || foundShop.shopName;
        console.log('✅ Found shop by shop string (as ID):', { shop: credit.shop, shopName });
        return shopName || 'Unknown Shop';
      }
      // If not found as ID, it might already be the shop name
      if (credit.shop !== 'Unknown Shop') {
        console.log('✅ Using shop field as name:', credit.shop);
        return credit.shop;
      }
    }

    // Priority 4: Direct shop object with name
    if (credit.shop && typeof credit.shop === 'object') {
      const shopName = credit.shop.name || credit.shop.shopName;
      if (shopName && shopName !== 'Unknown Shop') {
        console.log('✅ Using shop object name:', shopName);
        return shopName;
      }
    }

    // Priority 5: Check if shop is embedded in transaction
    if (credit.transactionId?.shop) {
      const transactionShop = credit.transactionId.shop;
      if (typeof transactionShop === 'object') {
        const shopName = transactionShop.name || transactionShop.shopName;
        if (shopName) {
          console.log('✅ Using transaction shop name:', shopName);
          return shopName;
        }
      } else if (typeof transactionShop === 'string' && transactionShop !== 'Unknown Shop') {
        console.log('✅ Using transaction shop string:', transactionShop);
        return transactionShop;
      }
    }

    console.log('❌ No shop name found for credit:', credit._id);
    return 'Unknown Shop';
  };

  // Get shop name for filter display
  const getShopNameForFilter = (shopId) => {
    if (!shopId || shopId === 'all') return 'All Shops';
    
    const foundShop = safeShops.find(s => s._id === shopId);
    return foundShop ? (foundShop.name || foundShop.shopName || 'Unknown Shop') : 'Unknown Shop';
  };

  // Get cashier name - ENHANCED
  const getCashierName = (credit) => {
    return credit.cashierName || credit.recordedBy || 'Unknown Cashier';
  };

  // Open edit modal with current data
  const openEditModal = (credit) => {
    setSelectedCredit(credit);
    editForm.setFieldsValue({
      shopId: credit.shopId || credit.shop,
      cashierName: credit.cashierName,
      customerName: credit.customerName,
      customerPhone: credit.customerPhone,
      dueDate: credit.dueDate ? dayjs(credit.dueDate) : null
    });
    setEditModalVisible(true);
  };

  // Shop filter options including "All Shops"
  const shopFilterOptions = [
    { value: 'all', label: 'All Shops' },
    ...safeShops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop'
    }))
  ];

  // Shop options for forms
  const shopOptions = safeShops.map(shop => ({
    value: shop._id,
    label: shop.name || shop.shopName || 'Unknown Shop'
  }));

  // ✅ FIXED: Columns for credits table with proper shop name display
  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || 'Unknown Customer'}</Text>
          {record.customerPhone && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.customerPhone}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Shop & Cashier',
      key: 'shopAndCashier',
      render: (_, record) => {
        const shopName = getShopName(record);
        const cashierName = getCashierName(record);
        
        console.log('🏪 Rendering shop & cashier:', {
          customer: record.customerName,
          shopName,
          cashierName,
          shopId: record.shopId,
          shop: record.shop
        });

        return (
          <Space direction="vertical" size={4}>
            <Tooltip title={`Shop ID: ${record.shopId || record.shop || 'N/A'}`}>
              <Tag icon={<ShopOutlined />} color="blue">
                {shopName}
              </Tag>
            </Tooltip>
            {cashierName && cashierName !== 'Unknown Cashier' && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <UserOutlined /> {cashierName}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Transaction',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (transaction) => (
        <Text code>
          {transaction?.transactionNumber || 'N/A'}
        </Text>
      )
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: 'Amount Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: 'Balance Due',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (balance, record) => {
        const safeBalance = Number(balance) || 0;
        return (
          <Text strong type={safeBalance > 0 ? 'danger' : 'success'}>
            {formatCurrency(safeBalance)}
          </Text>
        );
      }
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date, record) => {
        if (!date) return 'N/A';
        
        const dueDate = dayjs(date);
        const today = dayjs();
        
        if (!dueDate.isValid()) return 'Invalid Date';
        
        const daysUntilDue = dueDate.diff(today, 'day');
        
        let color = 'blue';
        let status = 'On Time';
        
        if (record.status === 'paid') {
          color = 'green';
          status = 'Paid';
        } else if (daysUntilDue < 0) {
          color = 'red';
          status = 'Overdue';
        } else if (daysUntilDue <= 2) {
          color = 'orange';
          status = 'Due Soon';
        }
        
        return (
          <Space direction="vertical" size={0}>
            <Text>{dueDate.format('DD/MM/YYYY')}</Text>
            <Tag color={color}>{status}</Tag>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        if (!record) return null;
        
        const safeBalance = Number(record.balanceDue) || 0;
        
        return (
          <Space>
            {record.status !== 'paid' && safeBalance > 0 && (
              <Tooltip title="Record Payment">
                <Button
                  type="link"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => {
                    setSelectedCredit(record);
                    setPaymentModalVisible(true);
                    paymentForm.setFieldsValue({
                      amount: Math.min(safeBalance, safeBalance),
                      paymentMethod: 'cash'
                    });
                  }}
                >
                  Pay
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Edit Record">
              <Button 
                type="link" 
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip title="View payment history">
              <Button 
                type="link" 
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedCredit(record);
                  fetchPaymentHistory(record._id);
                  setHistoryModalVisible(true);
                }}
              >
                History
              </Button>
            </Tooltip>
            <Popconfirm
              title="Delete Credit Record"
              description="Are you sure you want to delete this credit record? This action cannot be undone."
              onConfirm={() => handleDeleteCredit(record._id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Tooltip title="Delete Record">
                <Button 
                  type="link" 
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />}
                >
                  Delete
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  // Payment history columns
  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date) => formatDate(date)
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => (
        <Tag color={method === 'cash' ? 'green' : 'blue'}>
          {method?.toUpperCase() || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Recorded By',
      dataIndex: 'recordedBy',
      key: 'recordedBy',
      render: (name) => (
        <Space>
          <UserOutlined />
          {name || 'Unknown'}
        </Space>
      )
    },
    {
      title: 'Cashier',
      dataIndex: 'cashierName',
      key: 'cashierName',
      render: (name) => name || 'N/A'
    }
  ];

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [selectedShop]);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Credit Management</Title>

      {/* Debug Info */}
      <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f0f8ff', borderRadius: 6 }}>
        <Text strong>Debug Info: </Text>
        <Tag color="blue">Shops: {safeShops.length}</Tag>
        <Tag color="green">Credits: {credits.length}</Tag>
        <Button 
          size="small" 
          onClick={() => {
            console.log('🔍 Current shops:', safeShops);
            console.log('🔍 Current credits:', credits);
          }}
        >
          Debug Logs
        </Button>
      </div>

      {/* Due Soon Alert */}
      {dueSoonCredits.length > 0 && (
        <Alert
          message={`${dueSoonCredits.length} credit(s) due in 2 days or less`}
          description="Please follow up with customers for payment."
          type="warning"
          showIcon
          icon={<BellOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={fetchCredits}>
              View All
            </Button>
          }
        />
      )}

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={stats.totalOutstanding}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Collected"
              value={stats.totalCollected}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Credits"
              value={stats.totalPending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overdue Credits"
              value={stats.totalOverdue}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Enhanced Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Space>
              <Text strong>Shop:</Text>
              <Select
                value={selectedShop}
                onChange={setSelectedShop}
                style={{ width: 200 }}
                placeholder="Filter by shop"
                loading={shopLoading}
              >
                {shopFilterOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <Text strong>Status:</Text>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
                placeholder="Filter by status"
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="partially_paid">Partially Paid</Option>
                <Option value="paid">Paid</Option>
                <Option value="overdue">Overdue</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search customers, phone, transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={24} md={24} lg={24}>
            <Space>
              <Button 
                onClick={fetchCredits} 
                loading={loading}
                icon={<SyncOutlined />}
              >
                Refresh
              </Button>
              <Button 
                onClick={fetchShops} 
                loading={shopLoading}
                icon={<ShopOutlined />}
              >
                Refresh Shops
              </Button>
              <Text type="secondary">
                Showing {filteredCredits.length} of {credits.length} credits
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Credits Table */}
      <Card
        title={
          <Space>
            <DollarOutlined />
            Credit Records
            <Badge count={filteredCredits.length} showZero />
          </Space>
        }
        loading={loading}
        extra={
          <Space>
            <FilterOutlined />
            <Text type="secondary">
              Shop: {getShopNameForFilter(selectedShop)}
            </Text>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredCredits}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} credits`
          }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'No credit records found' }}
        />
      </Card>

      {/* Payment Modal */}
      <Modal
        title="Record Credit Payment"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedCredit(null);
          paymentForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedCredit && (
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={handlePayment}
          >
            <Form.Item label="Customer">
              <Input 
                value={selectedCredit.customerName || 'Unknown Customer'} 
                disabled 
              />
            </Form.Item>
            
            <Form.Item label="Shop">
              <Input 
                value={getShopName(selectedCredit)} 
                disabled 
              />
            </Form.Item>
            
            <Form.Item label="Cashier">
              <Input 
                value={getCashierName(selectedCredit)} 
                disabled 
              />
            </Form.Item>
            
            <Form.Item label="Total Amount">
              <Input 
                value={formatCurrency(selectedCredit.totalAmount)} 
                disabled 
              />
            </Form.Item>
            
            <Form.Item label="Amount Paid">
              <Input 
                value={formatCurrency(selectedCredit.amountPaid)} 
                disabled 
              />
            </Form.Item>
            
            <Form.Item label="Balance Due">
              <Input 
                value={formatCurrency(selectedCredit.balanceDue)} 
                disabled 
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[
                { required: true, message: 'Please enter payment amount' },
                {
                  validator: (_, value) => {
                    const balance = Number(selectedCredit.balanceDue) || 0;
                    if (value > balance) {
                      return Promise.reject(`Payment amount cannot exceed balance due of ${formatCurrency(balance)}`);
                    }
                    if (value <= 0) {
                      return Promise.reject('Payment amount must be greater than 0');
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter payment amount"
                min={0.01}
                max={Number(selectedCredit.balanceDue) || 0}
                step={0.01}
                precision={2}
                formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/KES\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select placeholder="Select payment method">
                <Option value="cash">Cash</Option>
                <Option value="mpesa">M-Pesa</Option>
                <Option value="bank">Bank Transfer</Option>
                <Option value="card">Card</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  icon={<DollarOutlined />}
                >
                  Record Payment
                </Button>
                <Button 
                  onClick={() => {
                    setPaymentModalVisible(false);
                    setSelectedCredit(null);
                    paymentForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Edit Credit Modal */}
      <Modal
        title="Edit Credit Record"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedCredit(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedCredit && (
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateCredit}
          >
            <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Transaction">
                {selectedCredit.transactionId?.transactionNumber || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                {formatCurrency(selectedCredit.totalAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Balance Due">
                {formatCurrency(selectedCredit.balanceDue)}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Form.Item
              name="shopId"
              label="Shop"
              rules={[{ required: true, message: 'Please select a shop' }]}
            >
              <Select 
                placeholder="Select shop"
                loading={shopLoading}
              >
                {shopOptions.map(shop => (
                  <Option key={shop.value} value={shop.value}>
                    {shop.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="cashierName"
              label="Cashier Name"
              rules={[{ required: true, message: 'Please enter cashier name' }]}
            >
              <Input 
                placeholder="Enter cashier name"
                prefix={<UserOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="customerName"
              label="Customer Name"
              rules={[{ required: true, message: 'Please enter customer name' }]}
            >
              <Input 
                placeholder="Enter customer name"
              />
            </Form.Item>

            <Form.Item
              name="customerPhone"
              label="Customer Phone"
              rules={[
                { required: true, message: 'Please enter customer phone' },
                { pattern: /^[0-9+\-\s()]{10,}$/, message: 'Please enter a valid phone number' }
              ]}
            >
              <Input 
                placeholder="Enter customer phone"
              />
            </Form.Item>

            <Form.Item
              name="dueDate"
              label="Due Date"
              rules={[{ required: true, message: 'Please select due date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(current) => current && current < dayjs().endOf('day')}
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  icon={<CheckCircleOutlined />}
                >
                  Update Record
                </Button>
                <Button 
                  onClick={() => {
                    setEditModalVisible(false);
                    setSelectedCredit(null);
                    editForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            Payment History - {selectedCredit?.customerName || 'Unknown Customer'}
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedCredit(null);
          setPaymentHistory([]);
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => {
              setHistoryModalVisible(false);
              setSelectedCredit(null);
              setPaymentHistory([]);
            }}
          >
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedCredit && (
          <div>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <Text strong>Credit Summary:</Text>
              <Row gutter={16}>
                <Col span={8}>
                  <Text>Total: {formatCurrency(selectedCredit.totalAmount)}</Text>
                </Col>
                <Col span={8}>
                  <Text>Paid: {formatCurrency(selectedCredit.amountPaid)}</Text>
                </Col>
                <Col span={8}>
                  <Text>Balance: {formatCurrency(selectedCredit.balanceDue)}</Text>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Text>Shop: {getShopName(selectedCredit)}</Text>
                </Col>
                <Col span={12}>
                  <Text>Cashier: {getCashierName(selectedCredit)}</Text>
                </Col>
              </Row>
            </Space>
            
            <Table
              columns={historyColumns}
              dataSource={paymentHistory}
              rowKey={(record, index) => index}
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: 'No payment history found' }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CreditManagement;