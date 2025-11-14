// src/components/CreditAnalysis.jsx
import React from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Space } from 'antd';
import { CreditCardOutlined, ShopOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const CreditAnalysis = ({ stats, selectedShop, shops }) => {
  // Safely format currency
  const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `KES ${value.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Safely format percentage
  const formatPercentage = (value) => {
    const num = Number(value) || 0;
    return `${num.toFixed(2)}%`;
  };

  // Get shop display name
  const getShopDisplayName = () => {
    if (selectedShop === 'all') return 'All Shops';
    const shop = shops.find(s => s._id === selectedShop);
    return shop ? shop.name : 'Unknown Shop';
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ marginBottom: '16px' }}>
        <CreditCardOutlined /> Credit Analysis
      </Title>

      <Card 
        style={{ marginBottom: '24px' }}
        title={
          <Space>
            <ShopOutlined />
            Shop: {getShopDisplayName()}
            <Tag color="blue">{selectedShop === 'all' ? `All Shops (${shops.length})` : 'Single Shop'}</Tag>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          {/* Total Credit Sales */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Total Credit Sales"
                value={stats.totalCreditSales || 0}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: '#1890ff',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Total sales on credit
              </Text>
            </Card>
          </Col>

          {/* Credit Sales Count */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Credit Sales Count"
                value={stats.creditSalesCount || 0}
                valueStyle={{ 
                  color: '#52c41a',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Number of credit transactions
              </Text>
            </Card>
          </Col>

          {/* Recognized Credit Revenue */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Recognized Credit Revenue"
                value={stats.recognizedCreditRevenue || 0}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: '#389e0d',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Credit revenue already collected
              </Text>
            </Card>
          </Col>

          {/* Credit Collection Rate */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Credit Collection Rate"
                value={stats.creditCollectionRate || 0}
                precision={2}
                suffix="%"
                valueStyle={{ 
                  color: stats.creditCollectionRate >= 70 ? '#389e0d' : 
                         stats.creditCollectionRate >= 50 ? '#faad14' : '#cf1322',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Percentage of credit collected
              </Text>
            </Card>
          </Col>

          {/* Outstanding Credit */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Outstanding Credit"
                value={stats.outstandingCredit || 0}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: '#cf1322',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Unpaid credit balance
              </Text>
            </Card>
          </Col>

          {/* Average Credit Sale */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Average Credit Sale"
                value={stats.averageCreditSale || 0}
                precision={2}
                prefix="KES"
                valueStyle={{ 
                  color: '#722ed1',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Average credit transaction value
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Summary Row */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <Card size="small" style={{ background: '#f9f9f9' }}>
              <Space size="large">
                <Text strong>Credit Performance Summary:</Text>
                <Text>
                  Collection Rate: <Tag color={stats.creditCollectionRate >= 70 ? 'success' : 'warning'}>
                    {formatPercentage(stats.creditCollectionRate)}
                  </Tag>
                </Text>
                <Text>
                  Outstanding: <Tag color="error">{formatCurrency(stats.outstandingCredit)}</Tag>
                </Text>
                <Text>
                  Collected: <Tag color="success">{formatCurrency(stats.recognizedCreditRevenue)}</Tag>
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default CreditAnalysis;