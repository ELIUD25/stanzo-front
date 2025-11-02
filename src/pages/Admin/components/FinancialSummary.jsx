import React from 'react';
import { Row, Col, Statistic, Card, Typography, Tag } from 'antd';
import { 
  DollarOutlined, 
  RiseOutlined, 
  FallOutlined, 
  ShoppingOutlined,
  LineChartOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const FinancialSummary = ({ stats }) => {
  // Handle both stats structures (from dashboard and transactions report)
  const overview = stats?.overview || stats || {};
  
  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  // Calculate profit margin if not provided
  const profitMargin = overview.profitMargin !== undefined ? 
    overview.profitMargin : 
    (overview.totalRevenue > 0 ? ((overview.netProfit || overview.totalProfit || 0) / overview.totalRevenue) * 100 : 0);

  return (
    <Card style={{ marginBottom: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <LineChartOutlined /> Financial Summary
      </Title>
      
      {/* Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="Total Revenue"
              value={overview.totalRevenue || 0}
              precision={2}
              prefix="KES "
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Gross Sales
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="Total Cost"
              value={overview.totalCost || 0}
              precision={2}
              prefix="KES "
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Cost of Goods
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="Total Profit"
              value={overview.netProfit || overview.totalProfit || 0}
              precision={2}
              prefix="KES "
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Net Profit
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="Profit Margin"
              value={profitMargin}
              precision={2}
              suffix="%"
              valueStyle={{ 
                color: profitMargin >= 20 ? '#52c41a' : 
                       profitMargin >= 10 ? '#faad14' : '#ff4d4f' 
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Margin Percentage
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Secondary Metrics Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Transactions"
              value={overview.totalTransactions || overview.totalSales || 0}
              valueStyle={{ color: '#1890ff' }}
            />
            {overview.totalTransactions > 0 && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {overview.averageTransaction ? formatCurrency(overview.averageTransaction) : 'KES 0.00'} avg
              </Text>
            )}
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Avg. Transaction"
              value={overview.averageTransaction || 0}
              precision={2}
              prefix="KES "
              valueStyle={{ color: '#13c2c2' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Per transaction
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Max Transaction"
              value={overview.maxTransaction || 0}
              precision={2}
              prefix="KES "
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Highest single sale
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Min Transaction"
              value={overview.minTransaction || 0}
              precision={2}
              prefix="KES "
              valueStyle={{ color: '#faad14' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Lowest single sale
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Performance Indicators */}
      {(overview.totalRevenue > 0) && (
        <div style={{ marginTop: 24, padding: 16, background: '#f6ffed', borderRadius: 6 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Text strong>Performance Indicators:</Text>
            </Col>
            <Col xs={12} md={6}>
              <Text>Revenue Efficiency: </Text>
              <Tag color={overview.averageTransaction > 1000 ? 'success' : 'warning'}>
                {formatCurrency(overview.averageTransaction || 0)}
              </Tag>
            </Col>
            <Col xs={12} md={6}>
              <Text>Margin Health: </Text>
              <Tag color={profitMargin > 20 ? 'success' : profitMargin > 10 ? 'warning' : 'error'}>
                {profitMargin.toFixed(1)}%
              </Tag>
            </Col>
            <Col xs={12} md={6}>
              <Text>Transaction Volume: </Text>
              <Tag color={(overview.totalTransactions || overview.totalSales || 0) > 50 ? 'success' : 'warning'}>
                {(overview.totalTransactions || overview.totalSales || 0)} transactions
              </Tag>
            </Col>
            <Col xs={12} md={6}>
              <Text>Profitability: </Text>
              <Tag color={(overview.netProfit || overview.totalProfit || 0) > 0 ? 'success' : 'error'}>
                {formatCurrency(overview.netProfit || overview.totalProfit || 0)}
              </Tag>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
};

export default FinancialSummary;