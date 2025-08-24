import React, { useState } from 'react';
import './NewPublicActivationPage.css';

const NewPublicActivationPage = () => {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [resultType, setResultType] = useState('');
  const [ticketDetails, setTicketDetails] = useState(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [activatorName, setActivatorName] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('');

  // Translations
  const translations = {
    title: 'BASMAH JO',
    subtitle: 'Ticket Activation System',
    qrPlaceholder: 'Enter QR Code or Scan Ticket',
    namePlaceholder: 'Please add your name',
    amountPlaceholder: 'Enter collected amount',
    checkButton: 'Check Ticket',
    activateButton: 'Mark as Used',
    confirmCollectionButton: 'Confirm Collection',
    activatingButton: 'Activating...',
    loadingText: 'Processing activation...',
    instructionsTitle: 'How to Activate a Ticket:',
    instructions: [
      'Ask the customer to show their ticket QR code',
      'Enter the QR code manually or scan it with your phone camera',
      'Enter your name in the field above',
      'For cash on arrival tickets, enter the collected amount',
      'Click "Mark as Used" to process the activation',
      'Confirm the customer details and activity information',
      'Complete the activation process'
    ],
    footer: '© 2024 Basmah Jo. All rights reserved.',
    support: 'For support, contact: support@basmahjo.com',
    successTitle: '✅ Ticket Activated Successfully!',
    customer: 'Customer:',
    activity: 'Activity:',
    ticketName: 'Ticket Type:',
    time: 'Time:',
    amount: 'Amount:',
    successMessage: 'The ticket has been marked as used and the customer can now access the activity.',
    cashCollectionMessage: 'Cash collection confirmed and ticket activated successfully.',
    errorQR: 'Please enter a QR code',
    errorName: 'Please add your name',
    errorAmount: 'Please enter the correct ticket amount',
    errorActivation: 'Failed to activate ticket. Please try again.',
    networkError: 'Network Error: Please check your connection and try again.',
    ticketDetails: 'Ticket Details',
    paymentMethod: 'Payment Method:',
    ticketPrice: 'Ticket Price:',
    requiresCashCollection: 'This ticket requires cash collection',
    cashOnArrival: 'Cash on Arrival',
    alreadyPaid: 'Already Paid',
    ticketUsed: 'This ticket has already been used',
    ticketUsedMessage: 'This ticket was used by {name} at {date}',
    ticketNotFound: 'Ticket not found',
    ticketNotFoundMessage: 'The QR code you scanned does not match any active ticket.',
    ticketNumber: 'Ticket Number',
    bookingNumber: 'Booking Number',
    ticketStatus: 'Ticket Status',
    activatedBy: 'Activated By',
    activatedAt: 'Activated At'
  };

  const t = translations;

  const showResult = (message, type = 'info') => {
    setResult(message);
    setResultType(type);
    setShowTicketDetails(false);
  };

  const handleCheckTicket = async (e) => {
    e.preventDefault();
    
    if (!qrCode.trim()) {
      showResult(`❌ ${t.errorQR}`, 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Checking ticket with QR code:', qrCode);

      // Call the new get_ticket_details function
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/get_ticket_details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_qr_code: qrCode
        })
      });

      const data = await response.json();
      console.log('📊 RPC Response:', data);

      if (data.success) {
        const ticketInfo = data.ticket_info;
        setTicketDetails(ticketInfo);
        setShowTicketDetails(true);

        // Show ticket details
        const ticketDisplay = `
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 120px; height: 80px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
              <span style="color: #6b7280;">🎫</span>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong style="color: #1f2937;">🎫 ${t.ticketDetails}</strong><br><br>
            <strong style="color: #374151;">🎫 ${t.ticketNumber}</strong> ${ticketInfo.full_ticket_id}<br>
            <strong style="color: #374151;">📋 ${t.bookingNumber}</strong> ${ticketInfo.short_booking_id}<br>
            <strong style="color: #374151;">${t.activity}</strong> ${ticketInfo.activity_title || 'Activity'}<br>
            <strong style="color: #374151;">📍 ${t.location}</strong> ${ticketInfo.activity_location || 'Location'}<br>
            <strong style="color: #374151;">👤 ${t.customer}</strong> ${ticketInfo.customer_name || 'Not specified'}<br>
            <strong style="color: #374151;">📧 ${t.email}</strong> ${ticketInfo.customer_email || 'Not specified'}<br>
            <strong style="color: #374151;">📱 ${t.phone}</strong> ${ticketInfo.customer_phone || 'Not specified'}<br>
            <strong style="color: #374151;">🎭 ${t.ticketType}</strong> ${ticketInfo.ticket_type || 'Not specified'}<br>
            <strong style="color: #374151;">💰 ${t.ticketPrice}</strong> ${(ticketInfo.total_amount || 0).toFixed(2)} JOD<br>
            <strong style="color: #374151;">💳 ${t.paymentMethod}</strong> ${ticketInfo.payment_method === 'cash_on_arrival' ? t.cashOnArrival : t.alreadyPaid}<br>
            <strong style="color: #374151;">📊 ${t.ticketStatus}</strong> ${ticketInfo.status}<br><br>
            
            ${ticketInfo.status === 'used' ? `
              <div style="background: #ef4444; color: white; padding: 8px; border-radius: 6px; font-weight: bold;">
                ❌ ${t.ticketUsed}
              </div>
            ` : `
              <div style="background: #10b981; color: white; padding: 8px; border-radius: 6px; font-weight: bold;">
                ✅ Ready to activate
              </div>
            `}
          </div>
        `;

        showResult(ticketDisplay, 'info');
      } else {
        showResult(`❌ ${data.error || 'Ticket not found'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Ticket check error:', error);
      showResult(`❌ ${t.networkError}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTicket = async (e) => {
    e.preventDefault();
    
    if (!activatorName.trim()) {
      showResult(`❌ ${t.errorName}`, 'error');
      return;
    }

    if (!ticketDetails) {
      showResult(`❌ ${t.errorActivation}`, 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('🎫 Activating ticket:', qrCode, 'by:', activatorName);

      // Call the new activate_ticket function
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/activate_ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_qr_code: qrCode,
          p_activated_by: activatorName
        })
      });

      const data = await response.json();
      console.log('📊 Activation Response:', data);

      if (data.success) {
        const successMessage = `
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 120px; height: 80px; background: #10b981; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
              <span style="color: white; font-size: 48px;">✅</span>
            </div>
          </div>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="color: #166534; margin-bottom: 16px;">${t.successTitle}</h3>
            <p style="color: #166534; margin-bottom: 8px;"><strong>${t.ticketNumber}:</strong> ${data.ticket_info.full_ticket_id}</p>
            <p style="color: #166534; margin-bottom: 8px;"><strong>${t.bookingNumber}:</strong> ${data.ticket_info.short_booking_id}</p>
            <p style="color: #166534; margin-bottom: 8px;"><strong>${t.customer}:</strong> ${data.ticket_info.customer_name}</p>
            <p style="color: #166534; margin-bottom: 8px;"><strong>${t.activity}:</strong> ${data.ticket_info.activity_title}</p>
            <p style="color: #166534; margin-bottom: 8px;"><strong>${t.activatedBy}:</strong> ${activatorName}</p>
            <p style="color: #166534; margin-bottom: 8px;"><strong>${t.activatedAt}:</strong> ${new Date().toLocaleString()}</p>
            <p style="color: #166534; margin-top: 16px;">${t.successMessage}</p>
          </div>
        `;
        
        showResult(successMessage, 'success');
        setQrCode('');
        setActivatorName('');
        setCollectedAmount('');
        setTicketDetails(null);
        setShowTicketDetails(false);
      } else {
        showResult(`❌ ${data.error || t.errorActivation}`, 'error');
      }
    } catch (error) {
      console.error('❌ Ticket activation error:', error);
      showResult(`❌ ${t.networkError}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="activation-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>{t.loadingText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="activation-page" dir="ltr">
      <div className="container">
        {/* Language Toggle */}
        <div className="language-toggle">
          <button 
            className="lang-btn active"
            onClick={() => {}}
            type="button"
          >
            English
          </button>
          <button 
            className="lang-btn"
            onClick={() => {}}
            type="button"
          >
            عربي
          </button>
        </div>

        <div className="logo">{t.title}</div>
        <div className="subtitle">{t.subtitle}</div>
        
        <form onSubmit={handleCheckTicket} className="activation-form">
          <input 
            type="text" 
            id="qrCode"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            className="qr-input" 
            placeholder={t.qrPlaceholder}
            required
            autoComplete="off"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="activate-btn" 
            disabled={loading}
          >
            {loading ? t.activatingButton : t.checkButton}
          </button>
        </form>

        {/* Ticket Details Section */}
        {showTicketDetails && ticketDetails && (
          <div className="ticket-details-section">
            <h3>{t.ticketDetails}</h3>
            
            {/* Ticket Information */}
            <div className="ticket-info">
              <div className="info-row">
                <strong>{t.activity}:</strong> {ticketDetails.activity_title || 'Not specified'}
              </div>
              <div className="info-row">
                <strong>{t.ticketName}:</strong> {ticketDetails.ticket_type || 'Not specified'}
              </div>
              <div className="info-row">
                <strong>{t.customer}:</strong> {ticketDetails.customer_name || 'Not specified'}
              </div>
              <div className="info-row">
                <strong>Email:</strong> {ticketDetails.customer_email || 'Not specified'}
              </div>
              <div className="info-row">
                <strong>Phone:</strong> {ticketDetails.customer_phone || 'Not specified'}
              </div>
              <div className="info-row">
                <strong>{t.paymentMethod}:</strong> {ticketDetails.payment_method === 'cash_on_arrival' ? t.cashOnArrival : t.alreadyPaid}
              </div>
              <div className="info-row">
                <strong>{t.ticketPrice}:</strong> {ticketDetails.total_amount || 0} JOD
              </div>
              <div className="info-row">
                <strong>{t.ticketStatus}:</strong> {ticketDetails.status}
              </div>
            </div>

            {/* Activation Form - Only show if ticket is valid */}
            {ticketDetails.status === 'valid' && (
              <form onSubmit={handleActivateTicket} className="activation-form">
                <input 
                  type="text" 
                  id="activatorName"
                  value={activatorName}
                  onChange={(e) => setActivatorName(e.target.value)}
                  className="name-input" 
                  placeholder={t.namePlaceholder}
                  required
                  autoComplete="off"
                  disabled={loading}
                />
                
                <button 
                  type="submit" 
                  className="activate-btn" 
                  disabled={loading}
                >
                  {loading ? t.activatingButton : t.activateButton}
                </button>
              </form>
            )}

            {/* Used Ticket Message */}
            {ticketDetails.status === 'used' && (
              <div className="used-ticket-message">
                <strong>❌ {t.ticketUsed}</strong><br />
                {t.ticketUsedMessage
                  .replace('{name}', ticketDetails.activated_by || 'Unknown')
                  .replace('{date}', ticketDetails.activated_at ? new Date(ticketDetails.activated_at).toLocaleString() : 'Unknown')
                }
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>{t.loadingText}</p>
          </div>
        )}

        {result && (
          <div className={`result ${resultType}`} dangerouslySetInnerHTML={{ __html: result }}></div>
        )}

        <div className="instructions">
          <h3>{t.instructionsTitle}</h3>
          <ol>
            {t.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>

        <div className="footer">
          <p>{t.footer}</p>
          <p>{t.support}</p>
        </div>
      </div>
    </div>
  );
};

export default NewPublicActivationPage;
