// src/components/ReceiptTemplate.jsx
import React, { useMemo } from 'react';
import { Typography, Divider, Tag, Space, Button, Card } from 'antd';
import { 
  ShopOutlined, UserOutlined, CalendarOutlined,
  BarcodeOutlined, PrinterOutlined,
  PhoneOutlined, EnvironmentOutlined,
  SafetyCertificateOutlined, FileTextOutlined, IdcardOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ReceiptTemplate = ({ 
  transaction, 
  shop, 
  companyInfo,
  onPrint,
  showPrintButton = true,
  compact = false
}) => {
  // Memoized calculations for better performance
  const receiptData = useMemo(() => {
    if (!transaction) {
      return {
        items: [],
        subtotal: 0,
        totalItems: 0
      };
    }

    const itemsWithCalculations = (transaction.items || []).map(item => {
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const totalPrice = item.totalPrice || (price * quantity);

      return {
        ...item,
        quantity,
        price,
        totalPrice
      };
    });

    const subtotal = itemsWithCalculations.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = itemsWithCalculations.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items: itemsWithCalculations,
      subtotal,
      totalItems
    };
  }, [transaction]);

  if (!transaction) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Text type="secondary">No transaction data available</Text>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  const getPaymentMethodColor = (method) => {
    const colors = {
      'cash': 'green',
      'mpesa': 'blue',
      'bank': 'purple',
      'card': 'orange'
    };
    return colors[method] || 'default';
  };

  const getPaymentMethodDisplay = (method) => {
    const methodMap = {
      'cash': 'CASH',
      'mpesa': 'MPESA',
      'bank': 'BANK TRANSFER',
      'card': 'CARD PAYMENT'
    };
    return methodMap[method] || method?.toUpperCase();
  };

  // Company information with defaults
  const company = {
    name: companyInfo?.name || 'STANZO SHOP',
    address: companyInfo?.address || 'Mikinduri, Kenya',
    phone: companyInfo?.phone || '+254 746919850',
    email: companyInfo?.email || 'stanzokinyua5967@gmail.com',
    slogan: companyInfo?.slogan || 'Quality Products, Best Prices',
    ...companyInfo
  };

  // Shop information with defaults
  const shopInfo = {
    name: shop?.name || 'The Place Club',
    location: shop?.location || 'Main Branch',
    phone: shop?.phone || company.phone,
    ...shop
  };

  return (
    <div style={{ 
      padding: compact ? '12px' : '20px', 
      border: '2px solid #000',
      borderRadius: '8px',
      background: '#fff',
      maxWidth: compact ? '300px' : '400px',
      margin: '0 auto',
      fontFamily: "'Courier New', monospace",
      fontSize: compact ? '10px' : '12px',
      lineHeight: '1.2'
    }} className="receipt-template">
      
      {/* Print Button */}
      {showPrintButton && !compact && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Button 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={onPrint}
            size="small"
          >
            Print Receipt
          </Button>
        </div>
      )}

      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: compact ? '8px' : '12px' }}>
        <Title level={compact ? 4 : 3} style={{ 
          margin: '0 0 4px 0', 
          fontSize: compact ? '16px' : '20px', 
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          <ShopOutlined /> {company.name}
        </Title>
        
        <Text strong style={{ fontSize: compact ? '10px' : '12px', display: 'block' }}>
          {shopInfo.name}
        </Text>
        
        <Text style={{ fontSize: compact ? '8px' : '10px', display: 'block' }}>
          <EnvironmentOutlined /> {shopInfo.location}
        </Text>
        
        <Text style={{ fontSize: compact ? '8px' : '10px', display: 'block' }}>
          <PhoneOutlined /> {company.phone}
        </Text>
        
        {!compact && (
          <Text style={{ fontSize: '9px', fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
            {company.slogan}
          </Text>
        )}
      </div>

      <Divider style={{ 
        margin: compact ? '6px 0' : '10px 0', 
        borderColor: '#000',
        borderWidth: '1px'
      }} />

      {/* Transaction Information */}
      <Space direction="vertical" size={compact ? 1 : 2} style={{ width: '100%', marginBottom: compact ? '8px' : '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Receipt No:</Text>
          <Text style={{ fontWeight: 'bold' }}>{transaction.receiptNumber || transaction.transactionNumber}</Text>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>
            <CalendarOutlined /> Date:
          </Text>
          <Text>{formatDate(transaction.saleDate)}</Text>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>
            <UserOutlined /> Cashier:
          </Text>
          <Text>{transaction.cashierName}</Text>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>Customer:</Text>
          <Text>{transaction.customerName || 'Walk-in Customer'}</Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Payment:</Text>
          <Tag 
            color={getPaymentMethodColor(transaction.paymentMethod)}
            style={{ 
              margin: 0, 
              fontSize: compact ? '8px' : '10px',
              padding: compact ? '1px 4px' : '2px 6px'
            }}
          >
            {getPaymentMethodDisplay(transaction.paymentMethod)}
          </Tag>
        </div>
      </Space>

      <Divider style={{ 
        margin: compact ? '6px 0' : '10px 0', 
        borderColor: '#000',
        borderWidth: '1px'
      }} />

      {/* Items Section */}
      <div style={{ marginBottom: compact ? '8px' : '12px' }}>
        {/* Items Header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: compact ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr',
          fontWeight: 'bold',
          marginBottom: '4px',
          borderBottom: '1px dashed #000',
          paddingBottom: '2px',
          fontSize: compact ? '9px' : '10px'
        }}>
          <Text>ITEM</Text>
          <Text style={{ textAlign: 'center' }}>QTY</Text>
          <Text style={{ textAlign: 'right' }}>PRICE</Text>
          <Text style={{ textAlign: 'right' }}>TOTAL</Text>
        </div>

        {/* Items List */}
        {receiptData.items.map((item, index) => (
          <div 
            key={index}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: compact ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr',
              marginBottom: '4px',
              fontSize: compact ? '8px' : '9px',
              padding: '1px 0',
              borderBottom: index < receiptData.items.length - 1 ? '1px dotted #ddd' : 'none'
            }}
          >
            <Text style={{ wordBreak: 'break-word', lineHeight: '1.1' }}>
              {item.productName}
              {item.barcode && !compact && (
                <div style={{ fontSize: '7px', color: '#666' }}>
                  <BarcodeOutlined /> {item.barcode}
                </div>
              )}
            </Text>
            <Text style={{ textAlign: 'center' }}>{item.quantity}</Text>
            <Text style={{ textAlign: 'right' }}>{(item.price || 0).toLocaleString()}</Text>
            <Text style={{ textAlign: 'right', fontWeight: 'bold' }}>
              {item.totalPrice.toLocaleString()}
            </Text>
          </div>
        ))}
      </div>

      <Divider style={{ 
        margin: compact ? '6px 0' : '10px 0', 
        borderColor: '#000',
        borderWidth: '1px'
      }} />

      {/* Financial Summary */}
      <Space direction="vertical" size={compact ? 1 : 2} style={{ width: '100%', marginBottom: compact ? '8px' : '12px' }}>
        {/* Simple Total */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px dashed #000', 
          paddingTop: '4px',
          marginTop: '2px'
        }}>
          <Text strong style={{ fontSize: compact ? '10px' : '12px' }}>TOTAL AMOUNT:</Text>
          <Text strong style={{ fontSize: compact ? '10px' : '12px' }}>
            {formatCurrency(transaction.totalAmount || receiptData.subtotal)}
          </Text>
        </div>
      </Space>

      {/* Quick Stats */}
      {!compact && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '4px', 
          marginBottom: '12px',
          fontSize: '8px'
        }}>
          <Tag color="blue" style={{ margin: 0, textAlign: 'center' }}>
            <FileTextOutlined /> {receiptData.items.length} Items
          </Tag>
          <Tag color="green" style={{ margin: 0, textAlign: 'center' }}>
            {receiptData.totalItems} Units
          </Tag>
        </div>
      )}

      <Divider style={{ 
        margin: compact ? '6px 0' : '10px 0', 
        borderColor: '#000',
        borderWidth: '1px'
      }} />

      {/* Footer Section */}
      <div style={{ textAlign: 'center' }}>
        <Text style={{ 
          fontSize: compact ? '8px' : '9px', 
          fontStyle: 'italic',
          display: 'block',
          marginBottom: '2px'
        }}>
          Thank you for your business!
        </Text>
        
        <Text style={{ fontSize: compact ? '7px' : '8px', display: 'block' }}>
          <SafetyCertificateOutlined /> Quality Guaranteed
        </Text>
        
        <Text style={{ fontSize: compact ? '7px' : '8px', display: 'block' }}>
          Returns within 7 days with original receipt
        </Text>
        
        {!compact && (
          <Text style={{ fontSize: '7px', display: 'block', marginTop: '2px' }}>
            Customer Service: {company.phone} | {company.email}
          </Text>
        )}
      </div>

      <Divider style={{ 
        margin: compact ? '4px 0' : '8px 0', 
        borderColor: '#000',
        borderWidth: '1px'
      }} />

      {/* Technical Information */}
      <div style={{ textAlign: 'center' }}>
        <Text style={{ fontSize: compact ? '6px' : '7px', display: 'block' }}>
          <IdcardOutlined /> TID: {transaction._id?.substring(0, 12)}...
        </Text>
        
        <Text style={{ fontSize: compact ? '6px' : '7px', display: 'block' }}>
          <BarcodeOutlined /> {transaction.transactionNumber}
        </Text>
        
        <Text style={{ fontSize: compact ? '6px' : '7px', display: 'block' }}>
          Printed: {new Date().toLocaleString('en-KE')}
        </Text>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt-template, .receipt-template * {
              visibility: visible;
            }
            .receipt-template {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 10px !important;
              font-size: 11px !important;
            }
            .ant-btn, .no-print {
              display: none !important;
            }
            .receipt-template .ant-divider {
              margin: 8px 0 !important;
            }
          }
          
          @media print and (max-width: 80mm) {
            .receipt-template {
              padding: 5px !important;
              fontSize: 9px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

// Additional utility component for receipt preview
export const ReceiptPreview = ({ transaction, shop, companyInfo }) => {
  return (
    <Card 
      title={
        <Space>
          <PrinterOutlined />
          Receipt Preview
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
        >
          Print Receipt
        </Button>
      }
    >
      <ReceiptTemplate 
        transaction={transaction}
        shop={shop}
        companyInfo={companyInfo}
        showPrintButton={false}
      />
    </Card>
  );
};

// Compact receipt for thermal printers
export const CompactReceipt = ({ transaction, shop, companyInfo }) => {
  return (
    <ReceiptTemplate 
      transaction={transaction}
      shop={shop}
      companyInfo={companyInfo}
      showPrintButton={false}
      compact={true}
    />
  );
};

export default ReceiptTemplate;