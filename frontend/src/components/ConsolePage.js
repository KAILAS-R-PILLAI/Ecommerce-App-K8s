import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ConsolePage = ({ user, token }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchOrders();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const config = {
        headers: { 'x-auth-token': token }
      };
      const res = await axios.get('/api/user/dashboard', config);
      setDashboardData(res.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const config = {
        headers: { 'x-auth-token': token }
      };
      const res = await axios.get('/api/orders/my-orders', config);
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Welcome to Your Console, {user?.username}!</Card.Title>
              <Card.Text>
                Email: {user?.email}
              </Card.Text>
              {dashboardData && (
                <Alert variant="info">
                  {dashboardData.message}
                  <br />
                  <small>Last updated: {new Date(dashboardData.timestamp).toLocaleString()}</small>
                </Alert>
              )}
              <Button as={Link} to="/products" variant="primary">
                Browse Products
              </Button>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5>Your Recent Orders</h5>
            </Card.Header>
            <Card.Body>
              {orders.length === 0 ? (
                <p>No orders yet. <Link to="/products">Start shopping!</Link></p>
              ) : (
                orders.map((order) => (
                  <div key={order._id} className="border-bottom mb-3 pb-3">
                    <strong>Order #{order.orderNumber}</strong>
                    <br />
                    Product: {order.product.name}
                    <br />
                    Quantity: {order.product.quantity}
                    <br />
                    Total: ${order.totalAmount}
                    <br />
                    Status: <span className="text-success">{order.status}</span>
                    <br />
                    <small>Ordered on: {new Date(order.createdAt).toLocaleDateString()}</small>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConsolePage;
