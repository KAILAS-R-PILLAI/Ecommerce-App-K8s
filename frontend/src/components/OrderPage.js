import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const OrderPage = ({ user, token }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    zipCode: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get('/api/products');
      const foundProduct = res.data.find(p => p._id === productId);
      setProduct(foundProduct);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const config = { headers: { 'x-auth-token': token } };
      const orderData = { productId, quantity, deliveryAddress };
      
      const res = await axios.post('/api/orders', orderData, config);
      alert(`Order placed successfully! Order Number: ${res.data.orderNumber}`);
      navigate('/console');
    } catch (error) {
      alert('Error placing order: ' + (error.response?.data?.message || 'Unknown error'));
    }
    setLoading(false);
  };

  if (!product) return <div>Loading...</div>;

  return (
    <Row className="justify-content-center">
      <Col md={8}>
        <Card>
          <Card.Body>
            <h3>Place Order - {product.name}</h3>
            <Row className="mb-4">
              <Col md={4}>
                <img src={product.image} alt={product.name} className="img-fluid" />
              </Col>
              <Col md={8}>
                <h5>{product.name}</h5>
                <p>{product.description}</p>
                <h4 className="text-primary">${product.price}</h4>
                <p>Stock: {product.stock} available</p>
              </Col>
            </Row>
            
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Quantity</Form.Label>
                <Form.Select 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                >
                  {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <h5>Delivery Address</h5>
              <Form.Group className="mb-3">
                <Form.Label>Street Address</Form.Label>
                <Form.Control
                  type="text"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                  required
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>City</Form.Label>
                    <Form.Control
                      type="text"
                      value={deliveryAddress.city}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Zip Code</Form.Label>
                    <Form.Control
                      type="text"
                      value={deliveryAddress.zipCode}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, zipCode: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  value={deliveryAddress.phone}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                  required
                />
              </Form.Group>

              <div className="bg-light p-3 mb-3">
                <h6>Order Summary</h6>
                <p>Product: {product.name} × {quantity}</p>
                <p>Total Amount: <strong>${(product.price * quantity).toFixed(2)}</strong></p>
                <p>Payment Method: <strong>Cash on Delivery</strong></p>
              </div>

              <Button type="submit" variant="success" className="w-100" disabled={loading}>
                {loading ? 'Placing Order...' : 'Place Order (Cash on Delivery)'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default OrderPage;
