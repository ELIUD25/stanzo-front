
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  Select, 
  message, 
  Breadcrumb, 
  Spin, 
  Tag, 
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Alert,
  Tooltip
} from 'antd';
import { 
  DollarOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HomeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { expenseAPI, shopAPI } from '../../services/api';
import dayjs from 'dayjs';

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [shops, setShops] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalAmount: 0,
    averageExpense: 0
  });
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // ✅ NEW: Search and filter states
  const [searchText, setSearchText] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all');

  const categories = [
    { value: 'rent', label: 'Rent', color: 'red' },
    { value: 'utilities', label: 'Utilities', color: 'blue' },
    { value: 'salaries', label: 'Salaries', color: 'green' },
    { value: 'supplies', label: 'Supplies', color: 'orange' },
    { value: 'maintenance', label: 'Maintenance', color: 'purple' },
    { value: 'marketing', label: 'Marketing', color: 'cyan' },
    { value: 'transport', label: 'Transport', color: 'geekblue' },
    { value: 'other', label: 'Other', color: 'gray' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash', color: 'green' },
    { value: 'mpesa', label: 'M-Pesa/Bank', color: 'blue' }
  ];

  // ✅ UPDATED: API response handler
  const handleApiResponse = useCallback((response) => {
    if (!response) return null;

    if (Array.isArray(response)) {
      return response;
    }

    if (response.success !== undefined) {
      if (response.success) {
        return response.data || response;
      } else {
        throw new Error(response.message || 'API request failed');
      }
    }

    return response.data || response;
  }, []);

  // ✅ UPDATED: API error handler
  const handleApiError = useCallback((error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response) {
      const responseData = error.response.data;
      errorMessage = responseData?.message || 
                   responseData?.error || 
                   `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check if the backend is running.';
    } else {
      errorMessage = error.message;
    }
    
    message.error(errorMessage);
    return errorMessage;
  }, []);

  // ✅ UPDATED: Fetch shops with enhanced error handling
  const fetchShops = useCallback(async () => {
    setShopLoading(true);
    try {
      const response = await shopAPI.getAll();
      const shopsData = handleApiResponse(response);
      
      if (shopsData && Array.isArray(shopsData)) {
        setShops(shopsData);
      } else {
        console.warn('Unexpected shops response format:', shopsData);
        setShops([]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load shops';
      message.warning(errorMessage);
      setShops([]);
    } finally {
      setShopLoading(false);
    }
  }, [handleApiResponse]);

  // ✅ UPDATED: Fetch expenses with enhanced error handling
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.getAll();
      const expensesData = handleApiResponse(response);
      
      if (expensesData && Array.isArray(expensesData)) {
        setExpenses(expensesData);
        calculateStats(expensesData);
      } else {
        setError('Invalid expenses data format received from server');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load expenses. Please check your connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [handleApiResponse]);

  useEffect(() => {
    fetchExpenses();
    fetchShops();
  }, [fetchExpenses, fetchShops]);

  // ✅ UPDATED: Calculate statistics
  const calculateStats = useCallback((expensesData) => {
    if (!expensesData || !Array.isArray(expensesData)) {
      setStats({
        totalExpenses: 0,
        totalAmount: 0,
        averageExpense: 0
      });
      return;
    }

    const totalExpenses = expensesData.length;
    const totalAmount = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    setStats({
      totalExpenses,
      totalAmount,
      averageExpense
    });
  }, []);

  const handleRefresh = () => {
    fetchExpenses();
    message.success('Data refreshed successfully');
  };

  const handleAddExpense = () => {
    form.resetFields();
    setEditingExpense(null);
    setIsModalVisible(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      ...expense,
      date: expense.date ? dayjs(expense.date) : null,
      shop: expense.shop || (shops.length > 0 ? shops[0]._id : '')
    });
    setIsModalVisible(true);
  };

  // ✅ UPDATED: Delete expense with enhanced error handling
  const handleDeleteExpense = useCallback(async (id) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this expense? This action cannot be undone.',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await expenseAPI.delete(id);
          const updatedExpenses = expenses.filter(expense => expense._id !== id);
          setExpenses(updatedExpenses);
          calculateStats(updatedExpenses);
          message.success('Expense deleted successfully');
        } catch (error) {
          console.error('Error deleting expense:', error);
          handleApiError(error, 'Failed to delete expense');
        }
      }
    });
  }, [expenses, calculateStats, handleApiError]);

  // ✅ UPDATED: Prepare expense data for API
  const prepareExpenseData = useCallback((values) => {
    const selectedShop = shops.find(shop => shop._id === values.shop);
    
    if (!selectedShop) {
      throw new Error('Selected shop not found. Please refresh and try again.');
    }

    // Get current user data for recordedBy field
    const currentUser = JSON.parse(localStorage.getItem('adminData') || localStorage.getItem('cashierData') || '{}');
    const recordedBy = currentUser.name || currentUser.email || 'System';

    const expenseData = {
      category: values.category,
      amount: parseFloat(values.amount),
      date: values.date ? values.date.toISOString() : new Date().toISOString(),
      paymentMethod: values.paymentMethod,
      description: values.description || `${values.category} expense`,
      recordedBy: recordedBy,
      shop: values.shop,
      shopName: selectedShop.name || selectedShop.shopName,
      status: 'completed',
      notes: values.notes || '',
      referenceNumber: `EXP-${Date.now().toString().slice(-6)}`
    };

    return expenseData;
  }, [shops]);

  // ✅ UPDATED: Handle form submission with enhanced error handling
  const handleSubmit = useCallback(async (values) => {
    setFormLoading(true);
    try {
      const expenseData = prepareExpenseData(values);

      // Validation
      if (!expenseData.amount || expenseData.amount <= 0) {
        message.error('Amount must be greater than 0');
        return;
      }

      let result;
      if (editingExpense) {
        result = await expenseAPI.update(editingExpense._id, expenseData);
        const updatedExpenses = expenses.map(expense => 
          expense._id === editingExpense._id ? result : expense
        );
        setExpenses(updatedExpenses);
        calculateStats(updatedExpenses);
        message.success('Expense updated successfully');
      } else {
        result = await expenseAPI.create(expenseData);
        const newExpenses = [result, ...expenses];
        setExpenses(newExpenses);
        calculateStats(newExpenses);
        message.success('Expense added successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting expense:', error);
      
      if (error.response?.status === 400) {
        message.error('Validation failed. Please check your input.');
      } else if (error.response?.status === 409) {
        message.error('An expense with similar details already exists');
      } else if (error.response?.status === 404) {
        message.error('Expense not found. It may have been deleted.');
      } else {
        const errorMessage = error.message || 
                           (editingExpense ? 'Failed to update expense' : 'Failed to add expense');
        message.error(errorMessage);
      }
    } finally {
      setFormLoading(false);
    }
  }, [editingExpense, expenses, calculateStats, form, prepareExpenseData]);

  const getCategoryColor = (category) => {
    return categories.find(cat => cat.value === category)?.color || 'default';
  };

  const getPaymentMethodColor = (method) => {
    return paymentMethods.find(pm => pm.value === method)?.color || 'default';
  };

  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    return date ? dayjs(date).format('DD/MM/YYYY') : 'N/A';
  };

  const getShopName = (shopId) => {
    if (!shopId) return 'Unknown Shop';
    const shop = shops.find(s => s._id === shopId);
    return shop?.name || 'Unknown Shop';
  };

  // ✅ NEW: Shop options for forms and filters
  const shopOptions = useMemo(() => {
    return shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop',
      key: shop._id
    }));
  }, [shops]);

  // ✅ NEW: Shop filter options
  const shopFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Shops' }
    ];
    
    return [...baseOptions, ...shopOptions];
  }, [shopOptions]);

  // ✅ NEW: Category filter options
  const categoryFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Categories' }
    ];
    
    const categoryOptions = categories.map(cat => ({
      value: cat.value,
      label: cat.label
    }));
    
    return [...baseOptions, ...categoryOptions];
  }, [categories]);

  // ✅ NEW: Payment method filter options
  const paymentFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Payment Methods' }
    ];
    
    const paymentOptions = paymentMethods.map(pm => ({
      value: pm.value,
      label: pm.label
    }));
    
    return [...baseOptions, ...paymentOptions];
  }, [paymentMethods]);

  // ✅ NEW: Filter expenses based on search and filters
  const filteredExpenses = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) return [];

    return expenses.filter(expense => {
      // Search filter
      const matchesSearch = searchText === '' || 
        (expense.description && expense.description.toLowerCase().includes(searchText.toLowerCase())) ||
        (expense.category && expense.category.toLowerCase().includes(searchText.toLowerCase())) ||
        (getShopName(expense.shop) && getShopName(expense.shop).toLowerCase().includes(searchText.toLowerCase())) ||
        (expense.recordedBy && expense.recordedBy.toLowerCase().includes(searchText.toLowerCase()));

      // Shop filter
      const matchesShop = selectedShopFilter === 'all' || 
        expense.shop === selectedShopFilter;

      // Category filter
      const matchesCategory = selectedCategoryFilter === 'all' || 
        expense.category === selectedCategoryFilter;

      // Payment method filter
      const matchesPayment = selectedPaymentFilter === 'all' || 
        expense.paymentMethod === selectedPaymentFilter;

      return matchesSearch && matchesShop && matchesCategory && matchesPayment;
    });
  }, [expenses, searchText, selectedShopFilter, selectedCategoryFilter, selectedPaymentFilter, getShopName]);

  // ✅ NEW: Search and filter handlers
  const handleSearch = useCallback((value) => {
    setSearchText(value);
  }, []);

  const handleShopFilterChange = useCallback((value) => {
    setSelectedShopFilter(value);
  }, []);

  const handleCategoryFilterChange = useCallback((value) => {
    setSelectedCategoryFilter(value);
  }, []);

  const handlePaymentFilterChange = useCallback((value) => {
    setSelectedPaymentFilter(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedShopFilter('all');
    setSelectedCategoryFilter('all');
    setSelectedPaymentFilter('all');
  }, []);

  // ✅ UPDATED: Table columns with enhanced features
  const columns = useMemo(() => [
    { 
      title: 'Date', 
      dataIndex: 'date', 
      key: 'date',
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: formatDate,
      width: 100
    },
    { 
      title: 'Category', 
      dataIndex: 'category', 
      key: 'category',
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {categories.find(cat => cat.value === category)?.label || category}
        </Tag>
      ),
      width: 120,
      filters: categories.map(cat => ({ text: cat.label, value: cat.value })),
      onFilter: (value, record) => record.category === value,
    },
    { 
      title: 'Amount', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: amount => (
        <span style={{ fontWeight: 'bold', color: '#cf1322' }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
      width: 120
    },
    { 
      title: 'Shop', 
      dataIndex: 'shop', 
      key: 'shop',
      render: (shopId) => (
        <Tag color="blue">
          {getShopName(shopId)}
        </Tag>
      ),
      width: 120,
      filters: shops.map(shop => ({ text: shop.name, value: shop._id })),
      onFilter: (value, record) => record.shop === value,
    },
    { 
      title: 'Payment Method', 
      dataIndex: 'paymentMethod', 
      key: 'paymentMethod',
      render: (method) => (
        <Tag color={getPaymentMethodColor(method)}>
          {paymentMethods.find(pm => pm.value === method)?.label || method}
        </Tag>
      ),
      width: 130,
      filters: paymentMethods.map(pm => ({ text: pm.label, value: pm.value })),
      onFilter: (value, record) => record.paymentMethod === value,
    },
    { 
      title: 'Description', 
      dataIndex: 'description', 
      key: 'description',
      render: (desc) => desc || 'No description',
      width: 150,
      ellipsis: true
    },
    { 
      title: 'Recorded By', 
      dataIndex: 'recordedBy', 
      key: 'recordedBy',
      render: (name) => name || 'System',
      width: 120
    },
    { 
      title: 'Actions', 
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Expense">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => handleEditExpense(record)}
              aria-label="Edit expense"
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Expense">
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteExpense(record._id)}
              aria-label="Delete expense"
              size="small"
            />
          </Tooltip>
        </Space>
      )
    },
  ], [handleEditExpense, handleDeleteExpense, getCategoryColor, getPaymentMethodColor, getShopName, shops, categories, paymentMethods]);

  if (loading && expenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="management-content">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item onClick={() => navigate('/admin/dashboard')} style={{ cursor: 'pointer' }}>
          <HomeOutlined /> Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item>Expense Management</Breadcrumb.Item>
      </Breadcrumb>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={stats.totalExpenses}
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix="KES"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Expense"
              value={stats.averageExpense}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix="KES"
            />
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert
          message="Error Loading Expenses"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchExpenses}>
              Retry
            </Button>
          }
          style={{ marginBottom: '20px' }}
        />
      )}

      {/* ✅ NEW: Search and Filter Section */}
      <Card 
        title="Search & Filter"
        style={{ marginBottom: '20px' }}
        size="small"
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search descriptions, categories, shops..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Shop"
              value={selectedShopFilter}
              onChange={handleShopFilterChange}
              options={shopFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Category"
              value={selectedCategoryFilter}
              onChange={handleCategoryFilterChange}
              options={categoryFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Payment"
              value={selectedPaymentFilter}
              onChange={handlePaymentFilterChange}
              options={paymentFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Button 
              icon={<FilterOutlined />}
              onClick={handleClearFilters}
              style={{ width: '100%' }}
            >
              Clear Filters
            </Button>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <div style={{ textAlign: 'right', color: '#666', fontSize: '14px' }}>
              Showing: {filteredExpenses.length} of {expenses.length}
            </div>
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            <DollarOutlined /> Expense Management
          </h2>
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddExpense}
              disabled={shopOptions.length === 0}
            >
              Add Expense
            </Button>
          </Space>
        </div>
        
        {shopOptions.length === 0 && !shopLoading && (
          <Alert
            message="No Shops Available"
            description="You need to create shops first before adding expenses."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {filteredExpenses.length === 0 && !loading ? (
          <Alert
            message="No Expenses Found"
            description="You haven't added any expenses yet. Click 'Add Expense' to get started."
            type="info"
            showIcon
          />
        ) : (
          <Table 
            columns={columns} 
            dataSource={filteredExpenses} 
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} expenses`
            }}
            scroll={{ x: 1000 }}
            size="middle"
            locale={{
              emptyText: loading ? 'Loading expenses...' : 'No expenses found'
            }}
          />
        )}
      </Card>

      <Modal
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={600}
        maskClosable={false}
      >
        <Form 
          form={form} 
          onFinish={handleSubmit} 
          layout="vertical"
          initialValues={{ 
            amount: 0,
            paymentMethod: 'cash',
            category: 'other',
            date: dayjs(),
            shop: shops.length > 0 ? shops[0]._id : ''
          }}
        >
          <Form.Item 
            name="date" 
            label="Date" 
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="YYYY-MM-DD"
              placeholder="Select date"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item 
            name="shop" 
            label="Shop" 
            rules={[{ required: true, message: 'Please select a shop' }]}
            help={shopOptions.length === 0 ? "No shops available. Please add shops first." : undefined}
          >
            <Select 
              placeholder="Select shop"
              loading={shopLoading}
              disabled={shopOptions.length === 0}
              options={shopOptions}
            />
          </Form.Item>

          <Form.Item 
            name="category" 
            label="Category" 
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select 
              options={categories} 
              placeholder="Select category" 
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            />
          </Form.Item>

          <Form.Item 
            name="paymentMethod" 
            label="Payment Method" 
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select 
              options={paymentMethods} 
              placeholder="Select payment method" 
            />
          </Form.Item>

          <Form.Item 
            name="amount" 
            label="Amount (KES)" 
            rules={[
              { required: true, message: 'Please enter amount' },
              { 
                type: 'number',
                min: 0.01,
                transform: value => parseFloat(value),
                message: 'Amount must be greater than 0' 
              }
            ]}
          >
            <Input 
              type="number" 
              step="0.01" 
              min="0.01" 
              placeholder="Enter amount"
              addonBefore="KES"
            />
          </Form.Item>

          <Form.Item 
            name="description" 
            label="Description"
          >
            <Input.TextArea 
              placeholder="Enter expense description (optional)"
              rows={3}
            />
          </Form.Item>

          <Form.Item 
            name="notes" 
            label="Notes"
          >
            <Input.TextArea 
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Button 
              onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }} 
              style={{ marginRight: 8 }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={formLoading}
              disabled={shopOptions.length === 0}
            >
              {editingExpense ? 'Update' : 'Add'} Expense
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenseManagement;