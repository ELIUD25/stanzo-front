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
  Spin
} from 'antd';
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  BarChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { transactionAPI } from '../services/api';
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

      const transactions = await transactionAPI.getAll(params);
      
      // Calculate cashier performance
      const stats = calculateCashierStats(transactions);
      setCashierStats(stats);
    } catch (error) {
      console.error('Error fetching cashier performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCashierStats = (transactions) => {
    const cashierPerformance = {};
    
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
          transactions: []
        };
      }
      
      const cashier = cashierPerformance[cashierId];
      cashier.totalSales += transaction.totalAmount || 0;
      cashier.totalTransactions += 1;
      cashier.totalItemsSold += transaction.itemsCount || 0;
      cashier.totalRevenue += transaction.totalAmount || 0;
      cashier.totalProfit += transaction.profit || 0;
      cashier.transactions.push(transaction);
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
      profitMargin: cashier.profitMargin
    }));
  }, [cashierStats]);

  const columns = [
    {
      title: 'Cashier',
      dataIndex: 'cashierName',
      key: 'cashierName',
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
    },
    {
      title: 'Items Sold',
      dataIndex: 'totalItemsSold',
      key: 'totalItemsSold',
      sorter: (a, b) => a.totalItemsSold - b.totalItemsSold,
    },
    {
      title: 'Total Sales',
      dataIndex: 'totalSales',
      key: 'totalSales',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.totalSales - b.totalSales,
    },
    {
      title: 'Avg. Transaction',
      dataIndex: 'averageTransaction',
      key: 'averageTransaction',
      render: (amount) => `KES ${amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      sorter: (a, b) => a.averageTransaction - b.averageTransaction,
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
    }
  ];

  const totalStats = useMemo(() => {
    const totals = performanceData.reduce((acc, curr) => ({
      totalSales: acc.totalSales + (curr.totalSales || 0),
      totalTransactions: acc.totalTransactions + (curr.totalTransactions || 0),
      totalItemsSold: acc.totalItemsSold + (curr.totalItemsSold || 0),
      totalProfit: acc.totalProfit + (curr.totalProfit || 0)
    }), {
      totalSales: 0,
      totalTransactions: 0,
      totalItemsSold: 0,
      totalProfit: 0
    });

    totals.averageTransaction = totals.totalTransactions > 0 
      ? totals.totalSales / totals.totalTransactions 
      : 0;
    totals.profitMargin = totals.totalSales > 0
      ? (totals.totalProfit / totals.totalSales) * 100
      : 0;

    return totals;
  }, [performanceData]);

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
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small">
            <Statistic
              title="Avg. Transaction"
              value={totalStats.averageTransaction}
              precision={2}
              prefix="KES"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Table */}
      <Table
        columns={columns}
        dataSource={performanceData}
        pagination={false}
        scroll={{ x: true }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: '#fafafa' }}>
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
                  KES {totalStats.totalSales?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Text strong>
                  KES {totalStats.averageTransaction?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <Text strong style={{ color: totalStats.totalProfit >= 0 ? '#3f8600' : '#cf1322' }}>
                  KES {totalStats.totalProfit?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <Tag color={totalStats.profitMargin >= 20 ? 'green' : totalStats.profitMargin >= 10 ? 'orange' : 'red'}>
                  {totalStats.profitMargin?.toFixed(1)}%
                </Tag>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default CashierDailyPerformance;