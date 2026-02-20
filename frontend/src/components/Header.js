import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Header = ({ user, onLogout }) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">E-Shop</Navbar.Brand>
        <Nav className="ms-auto">
          {user ? (
            <>
              <Nav.Item className="me-3">
                <span className="navbar-text">
                  Welcome, {user.username} ({user.role})
                </span>
              </Nav.Item>
              {user.role === 'user' && (
                <Nav.Link as={Link} to="/products" className="me-2">Products</Nav.Link>
              )}
              <Button variant="outline-light" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Nav.Link as={Link} to="/login" className="me-2">Login</Nav.Link>
              <Nav.Link as={Link} to="/admin-login">Admin</Nav.Link>
            </>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
};

export default Header;
