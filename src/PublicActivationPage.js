import React, { useEffect, useState } from 'react';
import './WebActivationPage.css'; // Reuse the same CSS
import { supabase } from './supabaseClient';

const PublicActivationPage = () => {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultType, setResultType] = useState('');

  useEffect(() => {
    // Auto-focus on QR code input
    const qrInput = document.getElementById('qrCode');
    if (qrInput) {
      qrInput.focus();
    }

    // Handle URL parameters (for direct QR code activation)
    const urlParams = new URLSearchParams(window.location.search);
    const qrParam = urlParams.get('qr');
    if (qrParam) {
      setQrCode(qrParam);
      showResult('QR code loaded from URL. Click "Activate Ticket" to proceed.', 'info');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!qrCode.trim()) {
      showResult('Please enter a QR code', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Call Supabase RPC directly using the imported client
      const { data, error } = await supabase.rpc('activate_ticket', {
        qr_code_param: qrCode.trim(),
        activated_by_param: null,
        device_info_param: {
          platform: 'web',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        location_info_param: {
          timestamp: new Date().toISOString(),
          source: 'public_web'
        }
      });

      if (error) {
        console.error('Activation error:', error);
        showResult(`❌ Error: ${error.message}`, 'error');
      } else if (data && data.length > 0) {
        const activation = data[0];

        if (activation.success) {
          showResult(`
            <strong>✅ Ticket Activated Successfully!</strong><br><br>
            <strong>Customer:</strong> ${activation.customer_name}<br>
            <strong>Activity:</strong> ${activation.activity_title}<br>
            <strong>Time:</strong> ${new Date().toLocaleString()}<br><br>
            The ticket has been marked as used and the customer can now access the activity.
          `, 'success');

          // Clear form
          setQrCode('');
        } else {
          showResult(`❌ Activation Failed: ${activation.message}`, 'error');
        }
      } else {
        showResult('❌ Error: Failed to activate ticket. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Activation error:', error);
      showResult('❌ Network Error: Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showResult = (message, type) => {
    setResult(message);
    setResultType(type);
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        setResult(null);
        setResultType('');
      }, 5000);
    }
  };

  return (
    <div className="activation-page">
      <div className="container">
        <div className="logo">BASMAH JO</div>
        <div className="subtitle">Ticket Activation System</div>
        
        <form onSubmit={handleSubmit} className="activation-form">
          <input 
            type="text" 
            id="qrCode"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            className="qr-input" 
            placeholder="Enter QR Code or Scan Ticket"
            required
            autoComplete="off"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="activate-btn" 
            disabled={loading}
          >
            {loading ? 'Activating...' : 'Activate Ticket'}
          </button>
        </form>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Processing activation...</p>
          </div>
        )}

        {result && (
          <div className={`result ${resultType}`} dangerouslySetInnerHTML={{ __html: result }}></div>
        )}

        <div className="instructions">
          <h3>How to Activate a Ticket:</h3>
          <ol>
            <li>Ask the customer to show their ticket QR code</li>
            <li>Enter the QR code manually or scan it with your phone camera</li>
            <li>Click "Activate Ticket" to process the activation</li>
            <li>Confirm the customer details and activity information</li>
            <li>Complete the activation process</li>
          </ol>
        </div>

        <div className="footer">
          <p>© 2024 Basmah Jo. All rights reserved.</p>
          <p>For support, contact: support@basmahjo.com</p>
        </div>
      </div>
    </div>
  );
};

export default PublicActivationPage;

