// src/pages/Cashier/CashierDailySales.jsx
import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Typography, Space, Tag, Spin } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { transactionAPI } from '../../services/api';

const { Text } = Typography;

const CashierDailySales = ({ cashier, shop }) => {
  const [dailyStats, setDailyStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDailyStats = async () => {
      if (!cashier?._id || !shop?._id) return;
      
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch cashier's daily sales
        const response = await transactionAPI.getAll({
          cashierId: cashier._id,
          shopId: shop._id,
          startDate: today,
          endDate: today
        });
        
        const transactions = Array.isArray(response) ? response : [];
        
        // Calculate stats
        const totalSales = transactions.reduce((sum, transaction) => sum + (transaction.totalAmount || 0), 0);
        const totalTransactions = transactions.length;
        const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        setDailyStats({
          totalSales,
          totalTransactions,
          averageTransaction
        });
      } catch (error) {
        console.error('Error fetching daily stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDailyStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cashier, shop]);

  return (
    <Card 
      title={
        <Space>
          <DollarOutlined />
          Today's Sales Performance
          <Tag color="blue">{new Date().toLocaleDateString()}</Tag>
        </Space>
      }
      loading={loading}
    >
      <Row gutter={16}>
        <Col xs={12} sm={8}>
          <Statistic
            title="Total Sales"
            value={dailyStats.totalSales}
            precision={2}
            prefix="KES"
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Transactions"
            value={dailyStats.totalTransactions}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Avg. Transaction"
            value={dailyStats.averageTransaction}
            precision={2}
            prefix="KES"
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
      </Row>
      
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <Row gutter={16} justify="space-between">
          <Col>
            <Space>
              <UserOutlined />
              <Text strong>Cashier:</Text>
              <Text>{cashier?.name || 'Unknown'}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <ShopOutlined />
              <Text strong>Shop:</Text>
              <Text>{shop?.name || 'Unknown'}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Status:</Text>
              <Tag color="green">Active</Tag>
            </Space>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default CashierDailySales;