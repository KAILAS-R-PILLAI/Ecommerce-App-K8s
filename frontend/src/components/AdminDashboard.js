import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button } from 'react-bootstrap';
import axios from 'axios';

const AdminDashboard = ({ token }) => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get('/api/admin/stats', config);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get('/api/admin/users', config);
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get('/api/admin/orders', config);
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      await axios.patch(`/api/admin/orders/${orderId}`, { status }, config);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Admin Dashboard</h2>
      
      <div className="mb-4">
        <Button 
          variant={activeTab === 'dashboard' ? 'primary' : 'outline-primary'}
          className="me-2"
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </Button>
        <Button 
          variant={activeTab === 'users' ? 'primary' : 'outline-primary'}
          className="me-2"
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </Button>
        <Button 
          variant={activeTab === 'orders' ? 'primary' : 'outline-primary'}
          onClick={() => setActiveTab('orders')}
        >
          Orders ({orders.length})
        </Button>
      </div>

      {activeTab === 'dashboard' && (
        <Row>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Total Users</Card.Title>
                <h3 className="text-primary">{stats.totalUsers || 0}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Total Orders</Card.Title>
                <h3 className="text-success">{stats.totalOrders || 0}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Total Revenue</Card.Title>
                <h3 className="text-warning">${stats.totalRevenue?.toFixed(2) || '0.00'}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Active Products</Card.Title>
                <h3 className="text-info">3</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {activeTab === 'users' && (
        <Card>
          <Card.Header>Registered Users</Card.Header>
          <Card.Body>
            <Table responsive striped>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {activeTab === 'orders' && (
        <Card>
          <Card.Header>All Orders</Card.Header>
          <Card.Body>
            <Table responsive striped>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>User</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.username}</td>
                    <td>{order.product.name}</td>
                    <td>${order.totalAmount}</td>
                    <td>
                      <Badge 
                        bg={order.status === 'Confirmed' ? 'success' : 
                            order.status === 'Shipped' ? 'info' : 
                            order.status === 'Delivered' ? 'primary' : 'secondary'}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        className="form-select form-select-sm"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
