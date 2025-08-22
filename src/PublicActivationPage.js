import React, { useEffect, useState } from 'react';
import './WebActivationPage.css'; // Reuse the same CSS
import { supabase } from './supabaseClient';

const PublicActivationPage = () => {
  const [qrCode, setQrCode] = useState('');
  const [activatorName, setActivatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultType, setResultType] = useState('');
  const [language, setLanguage] = useState('en'); // 'en' or 'ar'

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
      showResult('QR code loaded from URL. Click "Mark as Used" to proceed.', 'info');
    }
  }, []);

  // Translations
  const translations = {
    en: {
      title: 'BASMAH JO',
      subtitle: 'Ticket Activation System',
      qrPlaceholder: 'Enter QR Code or Scan Ticket',
      namePlaceholder: 'Please add your name',
      activateButton: 'Mark as Used',
      activatingButton: 'Activating...',
      loadingText: 'Processing activation...',
      instructionsTitle: 'How to Activate a Ticket:',
      instructions: [
        'Ask the customer to show their ticket QR code',
        'Enter the QR code manually or scan it with your phone camera',
        'Enter your name in the field above',
        'Click "Mark as Used" to process the activation',
        'Confirm the customer details and activity information',
        'Complete the activation process'
      ],
      footer: '© 2024 Basmah Jo. All rights reserved.',
      support: 'For support, contact: support@basmahjo.com',
      successTitle: '✅ Ticket Activated Successfully!',
      customer: 'Customer:',
      activity: 'Activity:',
      time: 'Time:',
      successMessage: 'The ticket has been marked as used and the customer can now access the activity.',
      errorQR: 'Please enter a QR code',
      errorName: 'Please add your name',
      errorActivation: 'Failed to activate ticket. Please try again.',
      networkError: 'Network Error: Please check your connection and try again.'
    },
    ar: {
      title: 'بسمة جو',
      subtitle: 'نظام تفعيل التذاكر',
      qrPlaceholder: 'أدخل رمز QR أو امسح التذكرة',
      namePlaceholder: 'يرجى إضافة اسمك',
      activateButton: 'تم الإستخدام',
      activatingButton: 'جاري التفعيل...',
      loadingText: 'جاري معالجة التفعيل...',
      instructionsTitle: 'كيفية تفعيل التذكرة:',
      instructions: [
        'اطلب من العميل إظهار رمز QR للتذكرة',
        'أدخل رمز QR يدوياً أو امسحه بكاميرا هاتفك',
        'أدخل اسمك في الحقل أعلاه',
        'انقر على "تم الإستخدام" لمعالجة التفعيل',
        'تأكد من تفاصيل العميل ومعلومات النشاط',
        'أكمل عملية التفعيل'
      ],
      footer: '© 2024 بسمة جو. جميع الحقوق محفوظة.',
      support: 'للدعم، اتصل بـ: support@basmahjo.com',
      successTitle: '✅ تم تفعيل التذكرة بنجاح!',
      customer: 'العميل:',
      activity: 'النشاط:',
      time: 'الوقت:',
      successMessage: 'تم تمييز التذكرة كمستخدمة ويمكن للعميل الآن الوصول إلى النشاط.',
      errorQR: 'يرجى إدخال رمز QR',
      errorName: 'يرجى إضافة اسمك',
      errorActivation: 'فشل في تفعيل التذكرة. يرجى المحاولة مرة أخرى.',
      networkError: 'خطأ في الشبكة: يرجى التحقق من اتصالك والمحاولة مرة أخرى.'
    }
  };

  const t = translations[language];

  // Debug language state
  console.log('Current language:', language);
  console.log('Current translations:', t);

  const handleLanguageChange = (newLanguage) => {
    console.log('Changing language from', language, 'to', newLanguage);
    setLanguage(newLanguage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!qrCode.trim()) {
      showResult(t.errorQR, 'error');
      return;
    }

    if (!activatorName.trim()) {
      showResult(t.errorName, 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Attempting to activate ticket with QR code:', qrCode.trim());
      
      // Call Supabase RPC directly using the imported client
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
        }
      });
      
      console.log('RPC Response:', { data, error });

      if (error) {
        console.error('Activation error:', error);
        showResult(`❌ ${language === 'ar' ? 'خطأ:' : 'Error:'} ${error.message}`, 'error');
      } else if (data) {
        // Handle JSON response
        const activation = data;

        if (activation.success) {
          showResult(`
            <strong>${t.successTitle}</strong><br><br>
            <strong>${t.customer}</strong> ${activation.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
            <strong>${t.activity}</strong> ${activation.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}<br>
            <strong>${t.time}</strong> ${new Date().toLocaleString()}<br><br>
            ${t.successMessage}
          `, 'success');

          // Clear form
          setQrCode('');
          setActivatorName('');
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
        
        <form onSubmit={handleSubmit} className="activation-form">
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

