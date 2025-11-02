import React from 'react';
import { Line } from 'react-chartjs-2';
import { Card, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title } = Typography;

const RevenueTrendChart = ({ data }) => {
  // Ensure data is properly formatted
  const chartData = {
    labels: data?.map(item => {
      if (item._id?.day) {
        return `${item._id.month}/${item._id.day}`;
      } else if (item._id?.hour !== undefined) {
        return `${item._id.hour}:00`;
      } else if (item.date) {
        return new Date(item.date).toLocaleDateString();
      }
      return '';
    }) || [],
    datasets: [
      {
        label: 'Revenue',
        data: data?.map(item => item.revenue || item.totalRevenue || 0) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      },
      {
        label: 'Profit',
        data: data?.map(item => item.profit || 0) || [],
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue & Profit Trends'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'KES ' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <Card style={{ marginBottom: 24 }}>
      <Title level={4}><BarChartOutlined /> Revenue & Profit Trends</Title>
      {data && data.length > 0 ? (
        <Line data={chartData} options={options} />
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p>No revenue data available for the selected period</p>
        </div>
      )}
    </Card>
  );
};

export default RevenueTrendChart;