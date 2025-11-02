// src/pages/Admin/ExpenseManagement.jsx
import React, { useState, useEffect } from 'react';
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
  Alert
} from 'antd';
import { 
  DollarOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HomeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { expenseAPI, handleApiError } from '../../services/api';
import dayjs from 'dayjs';

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalAmount: 0,
    averageExpense: 0
  });
  const [form] = Form.useForm();
  const navigate = useNavigate();

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

  // Updated payment methods - only cash or mpesa/bank
  const paymentMethods = [
    { value: 'cash', label: 'Cash', color: 'green' },
    { value: 'mpesa', label: 'M-Pesa/Bank', color: 'blue' }
  ];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching expenses data...');
      const expensesData = await expenseAPI.getAll();
      console.log('✅ Expenses loaded:', expensesData.length);
      
      setExpenses(expensesData);
      calculateStats(expensesData);
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      message.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (expensesData) => {
    const totalExpenses = expensesData.length;
    const totalAmount = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    setStats({
      totalExpenses,
      totalAmount,
      averageExpense
    });
  };

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
      date: expense.date ? dayjs(expense.date) : null
    });
    setIsModalVisible(true);
  };

  const handleDeleteExpense = async (id) => {
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
          console.error('❌ Error deleting expense:', error);
          message.error(handleApiError(error));
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    setFormLoading(true);
    try {
      console.log('📝 Submitting expense with values:', values);
      
      const formattedValues = {
        category: values.category,
        amount: parseFloat(values.amount),
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        paymentMethod: values.paymentMethod
      };

      console.log('📦 Formatted expense data:', formattedValues);

      let result;
      if (editingExpense) {
        result = await expenseAPI.update(editingExpense._id, formattedValues);
        const updatedExpenses = expenses.map(expense => 
          expense._id === editingExpense._id ? result : expense
        );
        setExpenses(updatedExpenses);
        calculateStats(updatedExpenses);
        message.success('Expense updated successfully');
      } else {
        result = await expenseAPI.create(formattedValues);
        const newExpenses = [result, ...expenses];
        setExpenses(newExpenses);
        calculateStats(newExpenses);
        message.success('Expense added successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('❌ Error submitting expense:', error);
      message.error(handleApiError(error));
    } finally {
      setFormLoading(false);
    }
  };

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

  const columns = [
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
      title: 'Actions', 
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditExpense(record)}
            aria-label="Edit expense"
            size="small"
          />
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteExpense(record._id)}
            aria-label="Delete expense"
            size="small"
          />
        </Space>
      )
    },
  ];

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
            >
              Add Expense
            </Button>
          </Space>
        </div>
        
        {expenses.length === 0 && !loading ? (
          <Alert
            message="No Expenses Found"
            description="You haven't added any expenses yet. Click 'Add Expense' to get started."
            type="info"
            showIcon
          />
        ) : (
          <Table 
            columns={columns} 
            dataSource={expenses} 
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} expenses`
            }}
            scroll={{ x: 800 }}
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
        width={500}
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
            date: dayjs()
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