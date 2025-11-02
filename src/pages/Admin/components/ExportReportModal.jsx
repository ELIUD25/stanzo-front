import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Select, 
  message, 
  Space, 
  Form, 
  Radio, 
  Divider,
  Alert,
  Typography
} from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

const ExportReportModal = ({ visible, onCancel, data, filters }) => {
  const [exportType, setExportType] = useState('detailed');
  const [format, setFormat] = useState('excel');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleExport = async () => {
    setLoading(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let exportData;
      let fileName = 'transaction_report';
      
      switch (exportType) {
        case 'detailed':
          exportData = data.transactions || [];
          fileName = 'transactions_detailed';
          break;
        case 'summary':
          exportData = data.stats || {};
          fileName = 'financial_summary';
          break;
        case 'trends':
          exportData = data.stats?.revenueTrends || [];
          fileName = 'revenue_trends';
          break;
        default:
          exportData = data.transactions || [];
      }

      // Add timestamp to filename
      const timestamp = new Date().toISOString().split('T')[0];
      fileName = `${fileName}_${timestamp}.${format}`;

      console.log('Exporting:', { 
        exportType, 
        format, 
        data: exportData, 
        filters,
        fileName 
      });

      // In a real application, you would generate the actual file format
      // For now, we'll export as JSON for demonstration
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'excel' ? 'application/vnd.ms-excel' : 
              'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success(`Report "${fileName}" exported successfully!`);
      onCancel();
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportOptions = [
    {
      value: 'detailed',
      label: 'Detailed Transactions',
      description: 'Complete transaction records with item details',
      icon: <FileTextOutlined />
    },
    {
      value: 'summary',
      label: 'Financial Summary',
      description: 'Overview of revenue, costs, and profit metrics',
      icon: <FileExcelOutlined />
    },
    {
      value: 'trends',
      label: 'Revenue Trends',
      description: 'Daily revenue and profit trends over time',
      icon: <FilePdfOutlined />
    }
  ];

  const formatOptions = [
    { value: 'excel', label: 'Excel (.xlsx)', icon: <FileExcelOutlined /> },
    { value: 'csv', label: 'CSV (.csv)', icon: <FileTextOutlined /> },
    { value: 'pdf', label: 'PDF (.pdf)', icon: <FilePdfOutlined /> }
  ];

  // Get transaction count based on data structure
  const getTransactionCount = () => {
    if (data?.transactions) {
      return data.transactions.length;
    }
    if (data?.sales) {
      return data.sales.length;
    }
    return 0;
  };

  return (
    <Modal
      title={
        <span>
          <DownloadOutlined /> Export Transaction Report
        </span>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
          size="large"
        >
          {loading ? 'Exporting...' : 'Export Report'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          exportType: 'detailed',
          format: 'excel'
        }}
      >
        <Alert
          message="Export Configuration"
          description="Choose the type of report and format you want to export."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form.Item
          label="Report Type"
          name="exportType"
          rules={[{ required: true, message: 'Please select a report type' }]}
        >
          <Radio.Group 
            value={exportType} 
            onChange={(e) => setExportType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {exportOptions.map(option => (
                <Radio key={option.value} value={option.value} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>
                      <strong>{option.label}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>{option.description}</div>
                    </span>
                    {option.icon}
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Export Format"
          name="format"
          rules={[{ required: true, message: 'Please select a format' }]}
        >
          <Select
            value={format}
            onChange={setFormat}
            style={{ width: '100%' }}
            size="large"
          >
            {formatOptions.map(option => (
              <Option key={option.value} value={option.value}>
                <Space>
                  {option.icon}
                  {option.label}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Divider />

        <Form.Item label="Applied Filters">
          <div style={{ 
            padding: 12, 
            background: '#f5f5f5', 
            borderRadius: 6,
            fontSize: '12px'
          }}>
            <strong>Current Filters:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {filters.dateRange && filters.dateRange.length === 2 && (
                <li>Date Range: {filters.dateRange[0]?.format('YYYY-MM-DD')} to {filters.dateRange[1]?.format('YYYY-MM-DD')}</li>
              )}
              {filters.shopFilter && <li>Shop: {filters.shopFilter}</li>}
              {filters.paymentMethodFilter && <li>Payment Method: {filters.paymentMethodFilter}</li>}
              {filters.cashierFilter && <li>Cashier: {filters.cashierFilter}</li>}
              {filters.statusFilter && <li>Status: {filters.statusFilter}</li>}
              {filters.searchText && <li>Search: "{filters.searchText}"</li>}
            </ul>
            <Text type="secondary">
              Exporting {getTransactionCount()} transactions
            </Text>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExportReportModal;