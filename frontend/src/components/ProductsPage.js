import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ProductsPage = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div>
      <h2 className="mb-4">Available Products</h2>
      <Row>
        {products.map((product) => (
          <Col md={4} key={product._id} className="mb-4">
            <Card>
              <Card.Img 
                variant="top" 
                src={product.image} 
                style={{ height: '200px', objectFit: 'cover' }}
              />
              <Card.Body>
                <Card.Title>{product.name}</Card.Title>
                <Card.Text>{product.description}</Card.Text>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="text-primary">${product.price}</h5>
                  <small className="text-muted">Stock: {product.stock}</small>
                </div>
                <Button 
                  as={Link} 
                  to={`/order/${product._id}`} 
                  variant="success" 
                  className="w-100 mt-2"
                  disabled={product.stock === 0}
                >
                  {product.stock > 0 ? 'Order Now (COD)' : 'Out of Stock'}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ProductsPage;
