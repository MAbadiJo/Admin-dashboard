import React from 'react';

const TestActivationPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          BASMAH JO
        </h1>
        <h2 style={{
          color: '#64748b',
          marginBottom: '40px',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          Ticket Activation System - TEST PAGE
        </h2>
        
        <div style={{
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '25px',
          border: '2px solid #e2e8f0'
        }}>
          <h3 style={{
            color: '#1e293b',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '25px',
            textAlign: 'center'
          }}>
            ✅ Page is Working!
          </h3>
          
          <p style={{
            color: '#475569',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '20px'
          }}>
            This is a test page to verify that the routing is working correctly.
          </p>
          
          <div style={{
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '16px',
            padding: '25px',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{
              color: '#1e293b',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>
              Test Information:
            </h4>
            <ul style={{
              color: '#475569',
              fontSize: '14px',
              lineHeight: '1.8',
              textAlign: 'left',
              paddingLeft: '20px'
            }}>
              <li>✅ React component is loading</li>
              <li>✅ CSS styles are working</li>
              <li>✅ Routing is functional</li>
              <li>✅ Page is responsive</li>
            </ul>
          </div>
        </div>
        
        <div style={{
          color: '#64748b',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <p>© 2024 Basmah Jo. All rights reserved.</p>
          <p>For support, contact: support@basmahjo.com</p>
        </div>
      </div>
    </div>
  );
};

export default TestActivationPage;
