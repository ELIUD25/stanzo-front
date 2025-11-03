// src/components/CashierDailyPerformance.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Space,
  DatePicker,
  Select,
  Spin,
  Alert
} from 'antd';
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { transactionAPI, creditAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const CashierDailyPerformance = ({ cashiers, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [cashierStats, setCashierStats] = useState({});
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('day'),
    dayjs().endOf('day')
  ]);
  const [selectedCashier, setSelectedCashier] = useState(
    currentUser?.role === 'cashier' ? currentUser._id : 'all'
  );
  const [creditData, setCreditData] = useState([]);

  const fetchCashierPerformance = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };

      if (selectedCashier !== 'all') {
        params.cashierId = selectedCashier;
      }

      // Fetch both transactions and credits
      const [transactions, credits] = await Promise.all([
        transactionAPI.getAll(params),
        creditAPI.getAll(params)
      ]);
      
      setCreditData(credits || []);
      
      // Calculate cashier performance with credit data
      const stats = calculateCashierStats(transactions, credits);
      setCashierStats(stats);
    } catch (error) {
      console.error('Error fetching cashier performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCashierStats = (transactions, credits = []) => {
    const cashierPerformance = {};
    
    // Process transactions
    transactions.forEach(transaction => {
      const cashierId = transaction.cashierId || 'unknown';
      const cashierName = transaction.cashierName || 'Unknown Cashier';
      
      if (!cashierPerformance[cashierId]) {
        cashierPerformance[cashierId] = {
          cashierId,
          cashierName,
          totalSales: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          cashAmount: 0,
          bankMpesaAmount: 0,
          creditAmount: 0,
          totalCreditCollected: 0,
          pendingCreditBalance: 0,
          transactions: [],
          credits: []
        };
      }
      
      const cashier = cashierPerformance[cashierId];
      const transactionAmount = transaction.totalAmount || 0;
      
      cashier.totalSales += transactionAmount;
      cashier.totalTransactions += 1;
      cashier.totalItemsSold += transaction.itemsCount || 0;
      cashier.totalRevenue += transactionAmount;
      cashier.totalProfit += transaction.profit || 0;
      cashier.transactions.push(transaction);

      // Track payment methods
      const paymentMethod = transaction.paymentMethod?.toLowerCase() || 'cash';
      if (paymentMethod === 'cash') {
        cashier.cashAmount += transactionAmount;
      } else if (paymentMethod === 'bank_mpesa') {
        cashier.bankMpesaAmount += transactionAmount;
      } else if (paymentMethod === 'credit') {
        cashier.creditAmount += transactionAmount;
      } else if (paymentMethod === 'cash_bank_mpesa') {
        cashier.cashAmount += transaction.cashAmount || 0;
        cashier.bankMpesaAmount += transaction.bankMpesaAmount || (transactionAmount - (transaction.cashAmount || 0));
      }
    });

    // Process credit data
    credits.forEach(credit => {
      const cashierId = credit.cashierId || 'unknown';
      const cashierName = credit.cashierName || 'Unknown Cashier';
      
      if (!cashierPerformance[cashierId]) {
        cashierPerformance[cashierId] = {
          cashierId,
          cashierName,
          totalSales: 0,
          totalTransactions: 0,
          totalItemsSold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          cashAmount: 0,
          bankMpesaAmount: 0,
          creditAmount: 0,
          totalCreditCollected: 0,
          pendingCreditBalance: 0,
          transactions: [],
          credits: []
        };
      }
      
      const cashier = cashierPerformance[cashierId];
      cashier.credits.push(credit);
      cashier.totalCreditCollected += credit.amountPaid || 0;
      cashier.pendingCreditBalance += credit.balanceDue || 0;
      
      // Add credit sales to total revenue if not already counted in transactions
      if (!cashier.transactions.some(t => t._id === credit.transactionId)) {
        cashier.creditAmount += credit.totalAmount || 0;
        cashier.totalRevenue += credit.totalAmount || 0;
        cashier.totalSales += credit.totalAmount || 0;
      }
    });

    // Calculate averages and percentages
    Object.values(cashierPerformance).forEach(cashier => {
      cashier.averageTransaction = cashier.totalTransactions > 0 
        ? cashier.totalSales / cashier.totalTransactions 
        : 0;
      cashier.averageItemsPerTransaction = cashier.totalTransactions > 0
        ? cashier.totalItemsSold / cashier.totalTransactions
        : 0;
      cashier.profitMargin = cashier.totalRevenue > 0
        ? (cashier.totalProfit / cashier.totalRevenue) * 100
        : 0;
      
      // Calculate collection rate for credits
      const totalCreditSales = cashier.creditAmount;
      cashier.creditCollectionRate = totalCreditSales > 0
        ? (cashier.totalCreditCollected / totalCreditSales) * 100
        : 0;
    });

    return cashierPerformance;
  };

  useEffect(() => {
    fetchCashierPerformance();
  }, [dateRange, selectedCashier]);

  const performanceData = useMemo(() => {
    return Object.values(cashierStats).map(cashier => ({
      key: cashier.cashierId,
      cashierName: cashier.cashierName,
      totalSales: cashier.totalSales,
      totalTransactions: cashier.totalTransactions,
      totalItemsSold: cashier.totalItemsSold,
      averageTransaction: cashier.averageTransaction,
      averageItemsPerTransaction: cashier.averageItemsPerTransaction,
      totalProfit: cashier.totalProfit,
      profitMargin: cashier.profitMargin,
      cashAmount: cashier.cashAmount,
      bankMpesaAmount: cashier.bankMpesaAmount,
      creditAmount: cashier.creditAmount,
      totalCreditCollected: cashier.totalCreditCollected,
      pendingCreditBalance: cashier.pendingCreditBalance,
      creditCollectionRate: cashier.creditCollectionRate,
      creditCount: cashier.credits?.length || 0
    }));
  }, [cashierStats]);

  const columns = [
    {
      title: 'Cashier',
      dataIndex: 'cashierName',
      key: 'cashierName',
      fixed: 'left',
      width: 150,
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <Text strong>{name}</Text>
          {currentUser?._id === record.key && <Tag color="blue">You</Tag>}
        </Space>
      )
    },
    {
      title: 'Transactions',
      dataIndex: 'totalTransactions',
      key: 'totalTransactions',
      sorter: (a, b) => a.totalTransactions - b.totalTransactions,
      width: 120,
    },
    {
      title: 'Items Sold',
      dataIndex: 'totalItemsSold',
      key: 'totalItemsSold',
      sorter: (a, b) => a.totalItemsSold - b.totalItemsSold,
      width: 120,
      render: (items) => (
        <Space>
          <ShoppingOutlined />
          {items?.toLocaleString()}
        </Space>
      )
    },
    {
      title: 'Total Sales',
      dataIndex: 'totalSales',
      key: 'totalSales',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.totalSales - b.totalSales,
      width: 140,
    },
    {
      title: 'Cash',
      dataIndex: 'cashAmount',
      key: 'cashAmount',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.cashAmount - b.cashAmount,
      width: 130,
    },
    {
      title: 'Bank/Mpesa',
      dataIndex: 'bankMpesaAmount',
      key: 'bankMpesaAmount',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.bankMpesaAmount - b.bankMpesaAmount,
      width: 140,
    },
    {
      title: 'Credit Sales',
      dataIndex: 'creditAmount',
      key: 'creditAmount',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.creditAmount - b.creditAmount,
      width: 140,
    },
    {
      title: 'Credit Collected',
      dataIndex: 'totalCreditCollected',
      key: 'totalCreditCollected',
      render: (amount) => (
        <Text strong type="success">
          KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a, b) => a.totalCreditCollected - b.totalCreditCollected,
      width: 150,
    },
    {
      title: 'Pending Credit',
      dataIndex: 'pendingCreditBalance',
      key: 'pendingCreditBalance',
      render: (amount) => (
        <Text type="warning">
          KES {amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a, b) => a.pendingCreditBalance - b.pendingCreditBalance,
      width: 150,
    },
    {
      title: 'Collection Rate',
      dataIndex: 'creditCollectionRate',
      key: 'creditCollectionRate',
      render: (rate) => (
        <Tag color={rate >= 80 ? 'green' : rate >= 50 ? 'orange' : 'red'}>
          {rate?.toFixed(1)}%
        </Tag>
      ),
      sorter: (a, b) => a.creditCollectionRate - b.creditCollectionRate,
      width: 140,
    },
    {
      title: 'Avg. Transaction',
      dataIndex: 'averageTransaction',
      key: 'averageTransaction',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.averageTransaction - b.averageTransaction,
      width: 150,
    },
    {
      title: 'Profit',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      render: (profit) => (
        <Text style={{ color: profit >= 0 ? '#3f8600' : '#cf1322' }}>
          KES {profit?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a, b) => a.totalProfit - b.totalProfit,
      width: 130,
    },
    {
      title: 'Margin',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (margin) => (
        <Tag color={margin >= 20 ? 'green' : margin >= 10 ? 'orange' : 'red'}>
          {margin?.toFixed(1)}%
        </Tag>
      ),
      sorter: (a, b) => a.profitMargin - b.profitMargin,
      width: 100,
    }
  ];

  const totalStats = useMemo(() => {
    const totals = performanceData.reduce((acc, curr) => ({
      totalSales: acc.totalSales + (curr.totalSales || 0),
      totalTransactions: acc.totalTransactions + (curr.totalTransactions || 0),
      totalItemsSold: acc.totalItemsSold + (curr.totalItemsSold || 0),
      totalProfit: acc.totalProfit + (curr.totalProfit || 0),
      cashAmount: acc.cashAmount + (curr.cashAmount || 0),
      bankMpesaAmount: acc.bankMpesaAmount + (curr.bankMpesaAmount || 0),
      creditAmount: acc.creditAmount + (curr.creditAmount || 0),
      totalCreditCollected: acc.totalCreditCollected + (curr.totalCreditCollected || 0),
      pendingCreditBalance: acc.pendingCreditBalance + (curr.pendingCreditBalance || 0)
    }), {
      totalSales: 0,
      totalTransactions: 0,
      totalItemsSold: 0,
      totalProfit: 0,
      cashAmount: 0,
      bankMpesaAmount: 0,
      creditAmount: 0,
      totalCreditCollected: 0,
      pendingCreditBalance: 0
    });

    totals.averageTransaction = totals.totalTransactions > 0 
      ? totals.totalSales / totals.totalTransactions 
      : 0;
    totals.profitMargin = totals.totalSales > 0
      ? (totals.totalProfit / totals.totalSales) * 100
      : 0;
    totals.creditCollectionRate = totals.creditAmount > 0
      ? (totals.totalCreditCollected / totals.creditAmount) * 100
      : 0;

    return totals;
  }, [performanceData]);

  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          Cashier Daily Performance
          {currentUser?.role === 'cashier' && <Tag color="blue">Your Performance</Tag>}
        </Space>
      }
      extra={
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          {currentUser?.role === 'admin' && (
            <Select
              value={selectedCashier}
              onChange={setSelectedCashier}
              style={{ width: 200 }}
              placeholder="Select Cashier"
            >
              <Option value="all">All Cashiers</Option>
              {cashiers.map(cashier => (
                <Option key={cashier._id} value={cashier._id}>
                  {cashier.name}
                </Option>
              ))}
            </Select>
          )}
        </Space>
      }
      loading={loading}
    >
      {/* Credit Information Alert */}
      {totalStats.creditAmount > 0 && (
        <Alert
          message="Credit Sales Information"
          description={
            <Space>
              <Text>Total Credit Sales: {formatCurrency(totalStats.creditAmount)}</Text>
              <Text>Collected: {formatCurrency(totalStats.totalCreditCollected)}</Text>
              <Text>Pending: {formatCurrency(totalStats.pendingCreditBalance)}</Text>
              <Text>Collection Rate: {totalStats.creditCollectionRate?.toFixed(1)}%</Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Total Sales"
              value={totalStats.totalSales}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Total Transactions"
              value={totalStats.totalTransactions}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Items Sold"
              value={totalStats.totalItemsSold}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Cash Collected"
              value={totalStats.cashAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Bank/Mpesa"
              value={totalStats.bankMpesaAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Credit Sales"
              value={totalStats.creditAmount}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Credit Collected"
              value={totalStats.totalCreditCollected}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#389e0d' }}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Pending Credit"
              value={totalStats.pendingCreditBalance}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#d46b08' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Table */}
      <Table
        columns={columns}
        dataSource={performanceData}
        pagination={false}
        scroll={{ x: 1800 }}
        size="middle"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>{totalStats.totalTransactions}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <Text strong>{totalStats.totalItemsSold}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <Text strong>
                  {formatCurrency(totalStats.totalSales)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Text strong>
                  {formatCurrency(totalStats.cashAmount)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <Text strong>
                  {formatCurrency(totalStats.bankMpesaAmount)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <Text strong>
                  {formatCurrency(totalStats.creditAmount)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7}>
                <Text strong type="success">
                  {formatCurrency(totalStats.totalCreditCollected)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8}>
                <Text strong type="warning">
                  {formatCurrency(totalStats.pendingCreditBalance)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9}>
                <Tag color={totalStats.creditCollectionRate >= 80 ? 'green' : totalStats.creditCollectionRate >= 50 ? 'orange' : 'red'}>
                  {totalStats.creditCollectionRate?.toFixed(1)}%
                </Tag>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10}>
                <Text strong>
                  {formatCurrency(totalStats.averageTransaction)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={11}>
                <Text strong style={{ color: totalStats.totalProfit >= 0 ? '#3f8600' : '#cf1322' }}>
                  {formatCurrency(totalStats.totalProfit)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12}>
                <Tag color={totalStats.profitMargin >= 20 ? 'green' : totalStats.profitMargin >= 10 ? 'orange' : 'red'}>
                  {totalStats.profitMargin?.toFixed(1)}%
                </Tag>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* Additional Credit Information */}
      {creditData.length > 0 && (
        <Card 
          title={
            <Space>
              <CreditCardOutlined />
              Credit Sales Details
              <Tag>{creditData.length} credit transactions</Tag>
            </Space>
          } 
          style={{ marginTop: 16 }}
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title="Total Credit Sales"
                value={totalStats.creditAmount}
                precision={2}
                prefix="KES"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Amount Collected"
                value={totalStats.totalCreditCollected}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#389e0d' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Collection Rate"
                value={totalStats.creditCollectionRate}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: totalStats.creditCollectionRate >= 80 ? '#389e0d' : 
                         totalStats.creditCollectionRate >= 50 ? '#fa8c16' : '#cf1322' 
                }}
              />
            </Col>
          </Row>
        </Card>
      )}
    </Card>
  );
};

export default CashierDailyPerformance;