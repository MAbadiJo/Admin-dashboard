import React, { useEffect, useState } from 'react';
import './WebActivationPage.css'; // Reuse the same CSS
import { supabase } from './supabaseClient';

// Enhanced Public Activation Page - Updated for latest deployment
const PublicActivationPage = () => {
  const [qrCode, setQrCode] = useState('');
  const [activatorName, setActivatorName] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultType, setResultType] = useState('');
  const [language, setLanguage] = useState('en'); // 'en' or 'ar'
  const [ticketDetails, setTicketDetails] = useState(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    console.log('PublicActivationPage: Component mounted');
    setPageLoaded(true);
    
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
      showResult('QR code loaded from URL. Click "Check Ticket" to proceed.', 'info');
    }
  }, []);

  // Translations
  const translations = {
    en: {
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
      ticketUsedMessage: 'This ticket was used by {name} on {date}',
      ticketNotFound: 'Ticket not found',
      ticketNotFoundMessage: 'The QR code you scanned does not match any active ticket.'
    },
    ar: {
      title: 'بسمة جو',
      subtitle: 'نظام تفعيل التذاكر',
      qrPlaceholder: 'أدخل رمز QR أو امسح التذكرة',
      namePlaceholder: 'يرجى إضافة اسمك',
      amountPlaceholder: 'أدخل المبلغ المحصل',
      checkButton: 'فحص التذكرة',
      activateButton: 'تم الإستخدام',
      confirmCollectionButton: 'تأكيد التحصيل',
      activatingButton: 'جاري التفعيل...',
      loadingText: 'جاري معالجة التفعيل...',
      instructionsTitle: 'كيفية تفعيل التذكرة:',
      instructions: [
        'اطلب من العميل إظهار رمز QR للتذكرة',
        'أدخل رمز QR يدوياً أو امسحه بكاميرا هاتفك',
        'أدخل اسمك في الحقل أعلاه',
        'لتذاكر الدفع عند الوصول، أدخل المبلغ المحصل',
        'انقر على "تم الإستخدام" لمعالجة التفعيل',
        'تأكد من تفاصيل العميل ومعلومات النشاط',
        'أكمل عملية التفعيل'
      ],
      footer: '© 2024 بسمة جو. جميع الحقوق محفوظة.',
      support: 'للدعم، اتصل بـ: support@basmahjo.com',
      successTitle: '✅ تم تفعيل التذكرة بنجاح!',
      customer: 'العميل:',
      activity: 'النشاط:',
      ticketName: 'نوع التذكرة:',
      time: 'الوقت:',
      amount: 'المبلغ:',
      successMessage: 'تم تمييز التذكرة كمستخدمة ويمكن للعميل الآن الوصول إلى النشاط.',
      cashCollectionMessage: 'تم تأكيد تحصيل النقود وتفعيل التذكرة بنجاح.',
      errorQR: 'يرجى إدخال رمز QR',
      errorName: 'يرجى إضافة اسمك',
      errorAmount: 'يرجى إدخال المبلغ الصحيح للتذكرة',
      errorActivation: 'فشل في تفعيل التذكرة. يرجى المحاولة مرة أخرى.',
      networkError: 'خطأ في الشبكة: يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
      ticketDetails: 'تفاصيل التذكرة',
      paymentMethod: 'طريقة الدفع:',
      ticketPrice: 'سعر التذكرة:',
      requiresCashCollection: 'هذه التذكرة تتطلب تحصيل نقدي',
      cashOnArrival: 'الدفع عند الوصول',
      alreadyPaid: 'مدفوع مسبقاً',
      ticketUsed: 'هذه التذكرة مستخدمة بالفعل',
      ticketUsedMessage: 'تم استخدام هذه التذكرة بواسطة {name} في {date}',
      ticketNotFound: 'التذكرة غير موجودة',
      ticketNotFoundMessage: 'رمز QR الذي مسحته لا يتطابق مع أي تذكرة نشطة.'
    }
  };

  const t = translations[language];

  const handleLanguageChange = (newLanguage) => {
    console.log('Changing language from', language, 'to', newLanguage);
    setLanguage(newLanguage);
  };

  const handleCheckTicket = async (e) => {
    e.preventDefault();
    
    if (!qrCode.trim()) {
      showResult(t.errorQR, 'error');
      return;
    }

    setLoading(true);
    setResult(null);
    setTicketDetails(null);
    setShowTicketDetails(false);

    try {
      console.log('Checking ticket with QR code:', qrCode.trim());
      
      // Call Supabase RPC to get ticket details
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
        },
        collected_amount_param: null
      });
      
      console.log('RPC Response:', { data, error });

      if (error) {
        console.error('Ticket check error:', error);
        showResult(`❌ ${language === 'ar' ? 'خطأ:' : 'Error:'} ${error.message}`, 'error');
      } else if (data) {
        const ticketInfo = data;
        
        if (ticketInfo.success) {
          // Ticket is valid, show details
          setTicketDetails(ticketInfo);
          setShowTicketDetails(true);
          showResult(`
            <strong>✅ ${t.ticketDetails}</strong><br><br>
            <strong>${t.activity}</strong> ${ticketInfo.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
            <strong>${t.customer}</strong> ${ticketInfo.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
            <strong>${t.paymentMethod}</strong> ${ticketInfo.payment_method === 'cash_on_arrival' ? t.cashOnArrival : t.alreadyPaid}<br>
            <strong>${t.ticketPrice}</strong> ${ticketInfo.ticket_price || 0} JOD<br><br>
            ${ticketInfo.payment_method === 'cash_on_arrival' ? t.requiresCashCollection : 'Ready to activate'}
          `, 'info');
        } else {
          // Show ticket details even if there's an error (like requires cash collection)
          if (ticketInfo.requires_cash_collection) {
            setTicketDetails(ticketInfo);
            setShowTicketDetails(true);
            showResult(`
              <strong>⚠️ ${t.requiresCashCollection}</strong><br><br>
              <strong>${t.activity}</strong> ${ticketInfo.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
              <strong>${t.customer}</strong> ${ticketInfo.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
              <strong>${t.ticketPrice}</strong> ${ticketInfo.ticket_price || 0} JOD<br><br>
              Please enter the collected amount and your name to proceed.
            `, 'info');
          } else if (ticketInfo.message === 'Ticket already used') {
            // Show used ticket details
            setTicketDetails(ticketInfo);
            setShowTicketDetails(true);
            showResult(`
              <strong>❌ ${t.ticketUsed}</strong><br><br>
              <strong>${t.activity}</strong> ${ticketInfo.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
              <strong>${t.customer}</strong> ${ticketInfo.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
              <strong>${t.ticketPrice}</strong> ${ticketInfo.ticket_price || 0} JOD<br><br>
              ${t.ticketUsedMessage.replace('{name}', ticketInfo.used_by || 'Unknown').replace('{date}', ticketInfo.used_at ? new Date(ticketInfo.used_at).toLocaleString() : 'Unknown')}
            `, 'error');
          } else {
            showResult(`❌ ${ticketInfo.message}`, 'error');
          }
        }
      } else {
        showResult(`❌ ${t.errorActivation}`, 'error');
      }
    } catch (error) {
      console.error('Ticket check error:', error);
      showResult(`❌ ${t.networkError}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTicket = async (e) => {
    e.preventDefault();
    
    if (!qrCode.trim()) {
      showResult(t.errorQR, 'error');
      return;
    }

    if (!activatorName.trim()) {
      showResult(t.errorName, 'error');
      return;
    }

    // For cash on arrival, validate amount
    if (ticketDetails?.payment_method === 'cash_on_arrival') {
      if (!collectedAmount.trim() || parseFloat(collectedAmount) < (ticketDetails.ticket_price || 0)) {
        showResult(t.errorAmount, 'error');
        return;
      }
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Activating ticket with QR code:', qrCode.trim());
      
      // Call Supabase RPC to activate ticket
      const { data, error } = await supabase.rpc('activate_ticket', {
        qr_code_param: qrCode.trim(),
        activated_by_param: activatorName.trim(),
        device_info_param: {
          platform: 'web',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          activator_name: activatorName.trim()
        },
        location_info_param: {
          timestamp: new Date().toISOString(),
          source: 'public_web'
        },
        collected_amount_param: ticketDetails?.payment_method === 'cash_on_arrival' ? parseFloat(collectedAmount) : null
      });
      
      console.log('RPC Response:', { data, error });

      if (error) {
        console.error('Activation error:', error);
        showResult(`❌ ${language === 'ar' ? 'خطأ:' : 'Error:'} ${error.message}`, 'error');
      } else if (data) {
        const activation = data;

        if (activation.success) {
          const successMessage = activation.payment_method === 'cash_on_arrival' 
            ? t.cashCollectionMessage 
            : t.successMessage;

          showResult(`
            <strong>${t.successTitle}</strong><br><br>
            <strong>${t.customer}</strong> ${activation.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
            <strong>${t.activity}</strong> ${activation.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
            <strong>${t.time}</strong> ${new Date().toLocaleString()}<br>
            ${activation.payment_method === 'cash_on_arrival' ? `<strong>${t.amount}</strong> ${activation.collected_amount} JOD<br>` : ''}
            <br>${successMessage}
          `, 'success');

          // Clear form
          setQrCode('');
          setActivatorName('');
          setCollectedAmount('');
          setTicketDetails(null);
          setShowTicketDetails(false);
        } else {
          showResult(`❌ ${t.errorActivation}: ${activation.message}`, 'error');
        }
      } else {
        showResult(`❌ ${t.errorActivation}`, 'error');
      }
    } catch (error) {
      console.error('Activation error:', error);
      showResult(`❌ ${t.networkError}`, 'error');
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

  // Show loading state if page hasn't loaded yet
  if (!pageLoaded) {
    return (
      <div className="activation-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading activation page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="activation-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container">
        {/* Language Toggle */}
        <div className="language-toggle">
          <button 
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('en')}
            type="button"
          >
            English
          </button>
          <button 
            className={`lang-btn ${language === 'ar' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('ar')}
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
            
            {/* Activity Image */}
            {ticketDetails.image_url && (
              <div className="activity-image-container">
                <img 
                  src={ticketDetails.image_url.startsWith('http') ? ticketDetails.image_url : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/activities/${ticketDetails.image_url}`} 
                  alt="Activity" 
                  className="activity-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Ticket Information */}
            <div className="ticket-info">
              <div className="info-row">
                <strong>{t.activity}:</strong> {ticketDetails.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
              <div className="info-row">
                <strong>{t.ticketName}:</strong> {ticketDetails.ticket_type || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
              <div className="info-row">
                <strong>{t.customer}:</strong> {ticketDetails.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
              <div className="info-row">
                <strong>Email:</strong> {ticketDetails.customer_email || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
              <div className="info-row">
                <strong>Phone:</strong> {ticketDetails.customer_phone || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
              <div className="info-row">
                <strong>{t.paymentMethod}:</strong> {ticketDetails.payment_method === 'cash_on_arrival' ? t.cashOnArrival : t.alreadyPaid}
              </div>
              <div className="info-row">
                <strong>{t.ticketPrice}:</strong> {ticketDetails.ticket_price || 0} JOD
              </div>
            </div>

            {/* Activation Form - Only show if ticket is not already used */}
            {ticketDetails.message !== 'Ticket already used' && (
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
                
                {/* Cash Collection Field - Only show for cash on arrival */}
                {ticketDetails.payment_method === 'cash_on_arrival' && (
                  <input 
                    type="number" 
                    id="collectedAmount"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value)}
                    className="amount-input" 
                    placeholder={`${t.amountPlaceholder} (${ticketDetails.ticket_price} JOD)`}
                    min={ticketDetails.ticket_price}
                    step="0.01"
                    required
                    autoComplete="off"
                    disabled={loading}
                  />
                )}
                
                <button 
                  type="submit" 
                  className="activate-btn" 
                  disabled={loading}
                >
                  {loading ? t.activatingButton : 
                    (ticketDetails.payment_method === 'cash_on_arrival' ? t.confirmCollectionButton : t.activateButton)
                  }
                </button>
              </form>
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
export default PublicActivationPage;
