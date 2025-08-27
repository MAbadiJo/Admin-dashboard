import React, { useEffect, useRef, useState } from 'react';
import './WebActivationPage.css'; // Keep using your existing CSS
import { supabase } from './supabaseClient';

// Enhanced Public Activation Page with Camera QR Scanner (No external dependencies)
const PublicActivationPage = () => {
  const [qrCode, setQrCode] = useState('');
  const [activatorName, setActivatorName] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultType, setResultType] = useState('');
  const [language, setLanguage] = useState('en');
  const [ticketDetails, setTicketDetails] = useState(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [scannerSupported, setScannerSupported] = useState(
    typeof window !== 'undefined' && 'BarcodeDetector' in window
  );
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState('Position the QR code within the camera view');
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);

  // Run once on mount
  useEffect(() => {
    console.log('PublicActivationPage: Component mounted');
    setPageLoaded(true);

    // Auto-focus on QR code input
    const qrInput = document.getElementById('qrCode');
    if (qrInput) qrInput.focus();

    // Handle URL parameters (for direct QR code activation)
    const urlParams = new URLSearchParams(window.location.search);
    const qrParam = urlParams.get('qr');
    if (qrParam) {
      setQrCode(qrParam);
      showResult('QR code loaded from URL. Click "Check Ticket" to proceed.', 'info');
    }

    // Cleanup on unmount: stop any active camera
    return () => {
      cancelScanLoop();
      stopStreamTracks(streamRef.current);
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = null;
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the modal is shown *and* we have a stream, attach it to the video
  useEffect(() => {
    if (!showCamera || !stream || !videoRef.current) return;

    const video = videoRef.current;
    // iOS/Safari-friendly flags
    video.setAttribute('playsinline', 'true');
    video.playsInline = true;
    video.muted = true;

    try {
      video.srcObject = stream;
    } catch (err) {
      // Older fallback
      // @ts-ignore
      video.src = window.URL.createObjectURL(stream);
    }

    const onLoaded = async () => {
      try {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
          await playPromise;
        }
        // Start scanning after video is playing
        beginScanLoop();
      } catch (e) {
        console.warn('Auto play failed, will retry on user gesture.', e);
        setScanHint('Tap the video to start, then point at the QR');
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    if (video.readyState >= 2) onLoaded();

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [showCamera, stream]);

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
      scanButton: 'Scan QR Code',
      closeCamera: 'Close Camera',
      instructionsTitle: 'How to Activate a Ticket:',
      location: 'Location',
      email: 'Email',
      phone: 'Phone',
      ticketType: 'Ticket Type',
      quantity: 'Quantity',
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
      customer: 'Customer',
      activity: 'Activity',
      ticketName: 'Ticket Type',
      time: 'Time',
      amount: 'Amount',
      successMessage: 'The ticket has been marked as used and the customer can now access the activity.',
      cashCollectionMessage: 'Cash collection confirmed and ticket activated successfully.',
      errorQR: 'Please enter a QR code',
      errorName: 'Please add your name',
      errorAmount: 'Please enter the correct ticket amount',
      errorActivation: 'Failed to activate ticket. Please try again.',
      networkError: 'Network Error: Please check your connection and try again.',
      ticketDetails: 'Ticket Details',
      paymentMethod: 'Payment Method',
      ticketPrice: 'Ticket Price',
      serviceFee: 'Service Fee',
      totalPrice: 'Total Price',
      requiresCashCollection: 'This ticket requires cash collection',
      cashOnArrival: 'Cash on Arrival',
      alreadyPaid: 'Already Paid',
      ticketUsed: 'This ticket has already been used',
      ticketUsedMessage: 'This ticket was used by {name} on {date}',
      ticketNotFound: 'Ticket not found',
      ticketNotFoundMessage: 'The QR code you scanned does not match any active ticket.',
      ticketNumber: 'Ticket Number',
      bookingNumber: 'Booking Number',
      cameraError: 'Camera access denied or not available',
      scannerUnsupported: 'QR scanning is not supported on this browser. Please type the code manually.'
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
      scanButton: 'مسح رمز QR',
      closeCamera: 'إغلاق الكاميرا',
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
      customer: 'العميل',
      activity: 'النشاط',
      ticketName: 'نوع التذكرة',
      time: 'الوقت',
      amount: 'المبلغ',
      successMessage: 'تم تمييز التذكرة كمستخدمة ويمكن للعميل الآن الوصول إلى النشاط.',
      cashCollectionMessage: 'تم تأكيد تحصيل النقود وتفعيل التذكرة بنجاح.',
      errorQR: 'يرجى إدخال رمز QR',
      errorName: 'يرجى إضافة اسمك',
      errorAmount: 'يرجى إدخال المبلغ الصحيح للتذكرة',
      errorActivation: 'فشل في تفعيل التذكرة. يرجى المحاولة مرة أخرى.',
      networkError: 'خطأ في الشبكة: يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
      ticketDetails: 'تفاصيل التذكرة',
      paymentMethod: 'طريقة الدفع',
      ticketPrice: 'سعر التذكرة',
      serviceFee: 'رسوم الخدمة',
      totalPrice: 'السعر الإجمالي',
      requiresCashCollection: 'هذه التذكرة تتطلب تحصيل نقدي',
      cashOnArrival: 'الدفع عند الوصول',
      alreadyPaid: 'مدفوع مسبقاً',
      ticketUsed: 'هذه التذكرة مستخدمة بالفعل',
      ticketUsedMessage: 'تم استخدام هذه التذكرة بواسطة {name} في {date}',
      ticketNotFound: 'التذكرة غير موجودة',
      ticketNotFoundMessage: 'رمز QR الذي مسحته لا يتطابق مع أي تذكرة نشطة.',
      location: 'الموقع',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      ticketType: 'نوع التذكرة',
      quantity: 'الكمية',
      ticketNumber: 'رقم التذكرة',
      bookingNumber: 'رقم الحجز',
      cameraError: 'تم رفض الوصول للكاميرا أو غير متاحة',
      scannerUnsupported: 'متصفحك لا يدعم قراءة QR داخل الصفحة. الرجاء إدخال الرمز يدوياً.'
    }
  };

  const t = translations[language];

  const handleLanguageChange = (newLanguage) => {
    console.log('Changing language from', language, 'to', newLanguage);
    setLanguage(newLanguage);
  };

  // ---------- Scanner helpers ----------
  const stopStreamTracks = (mediaStream) => {
    try {
      if (mediaStream) mediaStream.getTracks().forEach((tr) => tr.stop());
    } catch {}
  };

  const cancelScanLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    detectorRef.current = null;
    setScanning(false);
  };

  const parsePossibleUrlQR = (val) => {
    // If the QR is a URL that includes ?qr=XYZ, extract XYZ
    try {
      const u = new URL(val);
      const qp = new URLSearchParams(u.search).get('qr');
      return qp || val;
    } catch {
      return val;
    }
  };

  const beginScanLoop = () => {
    if (!scannerSupported) {
      setScanHint(t.scannerUnsupported);
      return;
    }
    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      setScanning(true);
      setScanHint('Align the QR code inside the frame');

      const scan = async () => {
        try {
          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan);
            return;
          }

          const barcodes = await detectorRef.current.detect(video);
          if (barcodes && barcodes.length) {
            const raw = barcodes[0].rawValue || '';
            const extracted = parsePossibleUrlQR(raw);

            // Fill the input, stop camera, show message
            setQrCode(extracted);
            showResult('QR detected. Click "Check Ticket" to proceed.', 'info');

            stopCamera(); // closes modal + stops stream + cancels RAF
            // Optionally auto-click "Check Ticket": uncomment next lines if desired
            // setTimeout(() => {
            //   document.getElementById('checkTicketBtn')?.click();
            // }, 50);
            return;
          }
        } catch (err) {
          console.warn('Detection error:', err);
          // keep trying
        }
        rafRef.current = requestAnimationFrame(scan);
      };

      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      console.error('BarcodeDetector init failed:', e);
      setScannerSupported(false);
      setScanHint(t.scannerUnsupported);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showResult(t.cameraError, 'error');
        return;
      }

      // Prefer the back camera, with reasonable resolution
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      setShowCamera(true); // Show modal first so <video> exists

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      streamRef.current = mediaStream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      showResult(t.cameraError, 'error');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    cancelScanLoop();
    stopStreamTracks(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    setStream(null);
    setShowCamera(false);
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

      // Use the new RPC function for public access
      const { data: ticketData, error: ticketError } = await supabase.rpc(
        'get_public_ticket_details',
        { p_qr_code: qrCode.trim() }
      );

      console.log('RPC Response:', { ticketData, ticketError });

      if (ticketError) {
        console.error('RPC Error:', ticketError);
        showResult(`❌ ${t.errorActivation}: ${ticketError.message}`, 'error');
        setLoading(false);
        return;
      }

      if (!ticketData) {
        showResult(`❌ ${t.ticketNotFound}: ${t.ticketNotFoundMessage}`, 'error');
        setLoading(false);
        return;
      }

      const ticket = ticketData;

      // Check if ticket is already used
      if (ticket.status === 'used') {
        const usedTicketInfo = {
          success: false,
          message: 'Ticket already used',
          ticket_number: ticket.full_ticket_id,
          booking_number: ticket.short_booking_id,
          activity_title: ticket.activity_title,
          activity_location: ticket.activity_location,
          customer_name: ticket.customer_name,
          customer_email: ticket.customer_email,
          customer_phone: ticket.customer_phone,
          ticket_type: ticket.ticket_type,
          total_amount: ticket.total_price,
          payment_method: ticket.payment_method,
          used_by: ticket.activated_by,
          used_at: ticket.activated_at,
          activity_image: ticket.activity_image_url,
          // Individual pricing from the ticket
          unit_price: ticket.unit_price,
          service_fee: ticket.service_fee,
          total_price: ticket.total_price
        };

        setTicketDetails(usedTicketInfo);
        setShowTicketDetails(true);
        showResult(`❌ ${t.ticketUsed}`, 'error');
      } else {
        // Ticket is valid, show details
        const ticketInfo = {
          success: true,
          ticket_number: ticket.full_ticket_id,
          booking_number: ticket.short_booking_id,
          activity_title: ticket.activity_title,
          activity_location: ticket.activity_location,
          customer_name: ticket.customer_name,
          customer_email: ticket.customer_email,
          customer_phone: ticket.customer_phone,
          ticket_type: ticket.ticket_type,
          total_amount: ticket.total_price,
          payment_method: ticket.payment_method,
          // Individual pricing from the ticket
          unit_price: ticket.unit_price,
          service_fee: ticket.service_fee,
          total_price: ticket.total_price,
          activity_image: ticket.activity_image_url
        };

        setTicketDetails(ticketInfo);
        setShowTicketDetails(true);
        showResult('✅ Ticket verified successfully. Ready for activation.', 'success');
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
      if (!collectedAmount.trim() || parseFloat(collectedAmount) < (ticketDetails.total_price || 0)) {
        showResult(t.errorAmount, 'error');
        return;
      }
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Activating ticket with QR code:', qrCode.trim());

      // Use the new RPC function for public activation
      const { data: activationData, error: activationError } = await supabase.rpc(
        'activate_public_ticket',
        {
          p_qr_code: qrCode.trim(),
          p_activator_name: activatorName.trim(),
          p_collected_amount: ticketDetails?.payment_method === 'cash_on_arrival' 
            ? parseFloat(collectedAmount) 
            : null
        }
      );

      console.log('RPC Activation Response:', { activationData, activationError });

      if (activationError) {
        console.error('Activation RPC Error:', activationError);
        showResult(`❌ ${t.errorActivation}: ${activationError.message}`, 'error');
        setLoading(false);
        return;
      }

      if (activationData && activationData.success) {
        const successMessage =
          ticketDetails?.payment_method === 'cash_on_arrival'
            ? t.cashCollectionMessage
            : t.successMessage;

        showResult(
          `${t.successTitle}\n\n${t.customer}: ${
            ticketDetails?.customer_name || (language === 'ar' ? 'غير محدد' : 'Not specified')
          }\n${t.activity}: ${ticketDetails?.activity_title || (language === 'ar' ? 'غير محدد' : 'Not specified')}\n${
            t.time
          }: ${new Date().toLocaleString()}\n${
            ticketDetails?.payment_method === 'cash_on_arrival' ? `${t.amount}: ${collectedAmount} JOD\n` : ''
          }\n${successMessage}`,
          'success'
        );

        // Clear form
        setQrCode('');
        setActivatorName('');
        setCollectedAmount('');
        setTicketDetails(null);
        setShowTicketDetails(false);
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
      <div className="modern-activation-page">
        <div className="modern-container">
          <div className="modern-loading">
            <div className="modern-spinner"></div>
            <p>Loading activation page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-activation-page ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <style jsx>{`
        .modern-activation-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .modern-activation-page.rtl {
          direction: rtl;
          font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .modern-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .modern-header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .modern-title-section {
          text-align: center;
          flex: 1;
        }

        .modern-title {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .modern-subtitle {
          color: #6b7280;
          font-size: 1.125rem;
          font-weight: 500;
        }

        .modern-lang-toggle {
          display: flex;
          background: #f3f4f6;
          border-radius: 50px;
          padding: 4px;
          gap: 4px;
        }

        .modern-lang-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 50px;
          background: transparent;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modern-lang-btn.active {
          background: white;
          color: #667eea;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .modern-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .modern-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          margin-bottom: 32px;
          overflow: hidden;
        }

        .modern-card-header {
          padding: 32px 32px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .modern-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          font-weight: bold;
        }

        .modern-card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .modern-card-content {
          padding: 32px;
        }

        .modern-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modern-input-group {
          position: relative;
        }

        .modern-input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          font-size: 1.125rem;
          background: white;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .modern-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .modern-input:disabled {
          background: #f9fafb;
          color: #9ca3af;
        }

        .modern-input-icon {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          font-size: 18px;
        }

        .modern-button-group {
          display: flex;
          gap: 12px;
        }

        .modern-btn {
          padding: 16px 24px;
          border: none;
          border-radius: 16px;
          font-size: 1.125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          box-sizing: border-box;
        }

        .modern-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          flex: 1;
        }

        .modern-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
        }

        .modern-btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 2px solid #e5e7eb;
        }

        .modern-btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
          border-color: #d1d5db;
        }

        .modern-btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .modern-btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
        }

        .modern-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .modern-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modern-loading {
          text-align: center;
          padding: 60px 20px;
        }

        .modern-loading .modern-spinner {
          width: 48px;
          height: 48px;
          border-width: 4px;
          border-top-color: #667eea;
          margin: 0 auto 20px;
        }

        .modern-alert {
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-weight: 500;
        }

        .modern-alert-success {
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          color: #065f46;
        }

        .modern-alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .modern-alert-info {
          background: #eff6ff;
          border: 1px solid #dbeafe;
          color: #1e40af;
        }

        .modern-alert-icon {
          font-size: 20px;
          margin-top: 2px;
        }

        .modern-ticket-image {
          height: 200px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
          margin: -32px -32px 32px;
        }

        .modern-ticket-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modern-ticket-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 50%);
        }

        .modern-ticket-image-content {
          position: absolute;
          bottom: 24px;
          left: 32px;
          right: 32px;
          color: white;
        }

        .modern-ticket-image-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .modern-ticket-image-location {
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0.9;
        }

        .modern-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .modern-status-valid {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #d1fae5;
        }

        .modern-status-used {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .modern-info-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (min-width: 768px) {
          .modern-info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .modern-info-item {
          background: #f8fafc;
          padding: 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modern-info-icon {
          width: 20px;
          height: 20px;
          color: #6b7280;
          font-size: 16px;
        }

        .modern-info-content {
          flex: 1;
        }

        .modern-info-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .modern-info-value {
          font-weight: 600;
          color: #1f2937;
        }

        .modern-cash-collection {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .modern-cash-collection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #92400e;
          font-weight: 600;
        }

        .modern-instructions {
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
        }

        .modern-instructions-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .modern-instructions-grid {
          display: grid;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .modern-instructions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .modern-instruction-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .modern-instruction-number {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .modern-instruction-text {
          color: #374151;
          line-height: 1.6;
        }

        .modern-footer {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
        }

        .modern-footer-title {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .modern-footer-text {
          color: #6b7280;
          margin-bottom: 16px;
        }

        .modern-footer-support {
          padding-top: 16px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          color: #9ca3af;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .modern-camera-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modern-camera-content {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modern-camera-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .modern-camera-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .modern-camera-close {
          width: 40px;
          height: 40px;
          border: none;
          background: #f3f4f6;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modern-camera-close:hover {
          background: #e5e7eb;
        }

        .modern-camera-video {
          width: 100%;
          height: 280px;
          background: #000;
          border-radius: 16px;
          margin-bottom: 20px;
          object-fit: cover;
        }

        .modern-camera-hint {
          text-align: center;
          color: #6b7280;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .modern-scan-status {
          text-align: center;
          font-size: 0.9rem;
          color: #1e40af;
          margin-bottom: 16px;
        }

        .modern-used-ticket-info {
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-radius: 16px;
          padding: 24px;
          margin-top: 24px;
        }

        .modern-used-ticket-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          color: #991b1b;
          font-weight: 600;
        }

        .modern-used-ticket-details {
          display: grid;
          gap: 8px;
          font-size: 0.875rem;
        }

        @media (min-width: 768px) {
          .modern-used-ticket-details {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .modern-used-ticket-detail {
          color: #991b1b;
        }

        .modern-used-ticket-detail strong {
          color: #7f1d1d;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .modern-title {
            font-size: 2rem;
          }

          .modern-header-content {
            flex-direction: column;
            text-align: center;
          }

          .modern-container {
            padding: 20px 16px;
          }

          .modern-card-content {
            padding: 20px;
          }

          .modern-button-group {
            flex-direction: column;
          }

          .modern-btn-secondary {
            order: -1;
          }
        }

        /* RTL adjustments */
        .modern-activation-page.rtl .modern-input-icon {
          right: auto;
          left: 16px;
        }

        .modern-activation-page.rtl .modern-ticket-image-content {
          left: auto;
          right: 32px;
        }
      `}</style>

      {/* Header */}
      <div className="modern-header">
        <div className="modern-header-content">
          <div className="modern-title-section">
            <h1 className="modern-title">{t.title}</h1>
            <p className="modern-subtitle">{t.subtitle}</p>
          </div>

          {/* Language Toggle */}
          <div className="modern-lang-toggle">
            <button
              className={`modern-lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
            <button
              className={`modern-lang-btn ${language === 'ar' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('ar')}
            >
              عربي
            </button>
          </div>
        </div>
      </div>

      <div className="modern-container">
        {/* QR Code Input Section */}
        <div className="modern-card">
          <div className="modern-card-header">
            <div className="modern-icon">📱</div>
            <h2 className="modern-card-title">Scan or Enter QR Code</h2>
          </div>

          <div className="modern-card-content">
            <form onSubmit={handleCheckTicket} className="modern-form">
              <div className="modern-input-group">
                <input
                  type="text"
                  id="qrCode"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="modern-input"
                  placeholder={t.qrPlaceholder}
                  required
                  autoComplete="off"
                  disabled={loading}
                />
                <span className="modern-input-icon">#</span>
              </div>

              <div className="modern-button-group">
                <button type="submit" className="modern-btn modern-btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="modern-spinner"></div>
                      {t.activatingButton}
                    </>
                  ) : (
                    <>✓ {t.checkButton}</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="modern-btn modern-btn-secondary"
                  disabled={loading}
                >
                  📷 {t.scanButton}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="modern-camera-modal">
            <div className="modern-camera-content">
              <div className="modern-camera-header">
                <h3 className="modern-camera-title">Scan QR Code</h3>
                <button onClick={stopCamera} className="modern-camera-close">
                  ✕
                </button>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="modern-camera-video"
              />
              <p className="modern-camera-hint">{
                scannerSupported
                  ? 'Position the QR code within the camera view'
                  : t.scannerUnsupported
              }</p>
              {scannerSupported && (
                <div className="modern-scan-status">
                  {scanning ? 'Scanning…' : 'Initializing camera…'}
                </div>
              )}
              <button onClick={stopCamera} className="modern-btn modern-btn-secondary" style={{ width: '100%' }}>
                {t.closeCamera}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="modern-card">
            <div className="modern-loading">
              <div className="modern-spinner"></div>
              <p>{t.loadingText}</p>
            </div>
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div
            className={`modern-alert ${
              resultType === 'success'
                ? 'modern-alert-success'
                : resultType === 'error'
                ? 'modern-alert-error'
                : 'modern-alert-info'
            }`}
          >
            <span className="modern-alert-icon">
              {resultType === 'success' ? '✅' : resultType === 'error' ? '❌' : 'ℹ️'}
            </span>
            <div style={{ whiteSpace: 'pre-line' }}>{result}</div>
          </div>
        )}

        {/* Ticket Details */}
        {showTicketDetails && ticketDetails && (
          <div className="modern-card">
            {ticketDetails.activity_image && (
              <div className="modern-ticket-image">
                <img
                  src={
                    ticketDetails.activity_image.startsWith('http')
                      ? ticketDetails.activity_image
                      : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/activities/${ticketDetails.activity_image}`
                  }
                  alt="Activity"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="modern-ticket-image-overlay"></div>
                <div className="modern-ticket-image-content">
                  <h3 className="modern-ticket-image-title">{ticketDetails.activity_title}</h3>
                  <p className="modern-ticket-image-location">📍 {ticketDetails.activity_location}</p>
                </div>
              </div>
            )}

            <div className="modern-card-content">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px'
                }}
              >
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span style={{ fontSize: '24px' }}>🎫</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>{t.ticketDetails}</span>
                </h3>
                <div
                  className={`modern-status-badge ${
                    ticketDetails.success === false ? 'modern-status-used' : 'modern-status-valid'
                  }`}
                >
                  {ticketDetails.success === false ? 'Used Ticket' : 'Valid Ticket'}
                </div>
              </div>

              <div className="modern-info-grid">
                <div className="modern-info-item">
                  <span className="modern-info-icon">#</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">{t.ticketNumber}</div>
                    <div className="modern-info-value">{ticketDetails.ticket_number}</div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">👤</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">{t.customer}</div>
                    <div className="modern-info-value">{ticketDetails.customer_name}</div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">📧</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">Email</div>
                    <div className="modern-info-value">{ticketDetails.customer_email}</div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">📱</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">Phone</div>
                    <div className="modern-info-value">{ticketDetails.customer_phone}</div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">💳</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">{t.paymentMethod}</div>
                    <div className="modern-info-value">
                      {ticketDetails.payment_method === 'cash_on_arrival' ? t.cashOnArrival : t.alreadyPaid}
                    </div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">💰</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">{t.ticketPrice}</div>
                    <div className="modern-info-value">{ticketDetails.unit_price} JOD</div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">💸</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">{t.serviceFee}</div>
                    <div className="modern-info-value">{ticketDetails.service_fee} JOD</div>
                  </div>
                </div>

                <div className="modern-info-item">
                  <span className="modern-info-icon">💳</span>
                  <div className="modern-info-content">
                    <div className="modern-info-label">{t.totalPrice}</div>
                    <div className="modern-info-value">{ticketDetails.total_price} JOD</div>
                  </div>
                </div>
              </div>

              {/* Activation Form - Only show if ticket is not already used */}
              {ticketDetails.message !== 'Ticket already used' && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '32px', marginTop: '32px' }}>
                  <h4
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '24px',
                      fontSize: '1.25rem',
                      fontWeight: '600'
                    }}
                  >
                    <span>👨‍💼</span> Activation Details
                  </h4>

                  <form onSubmit={handleActivateTicket} className="modern-form">
                    <div className="modern-input-group">
                      <input
                        type="text"
                        id="activatorName"
                        value={activatorName}
                        onChange={(e) => setActivatorName(e.target.value)}
                        className="modern-input"
                        placeholder={t.namePlaceholder}
                        required
                        autoComplete="off"
                        disabled={loading}
                      />
                      <span className="modern-input-icon">👤</span>
                    </div>

                    {/* Cash Collection Field - Only show for cash on arrival */}
                    {ticketDetails.payment_method === 'cash_on_arrival' && (
                      <div className="modern-cash-collection">
                        <div className="modern-cash-collection-header">⚠️ {t.requiresCashCollection}</div>
                        <div className="modern-input-group">
                          <input
                            type="number"
                            id="collectedAmount"
                            value={collectedAmount}
                            onChange={(e) => setCollectedAmount(e.target.value)}
                            className="modern-input"
                            placeholder={`${t.amountPlaceholder} (${ticketDetails.total_price || 0} JOD)`}
                            min={ticketDetails.total_price || 0}
                            step="0.01"
                            required
                            autoComplete="off"
                            disabled={loading}
                          />
                          <span className="modern-input-icon">💰</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="modern-btn modern-btn-success"
                      style={{ width: '100%' }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="modern-spinner"></div>
                          {t.activatingButton}
                        </>
                      ) : (
                        <>
                          ✅{' '}
                          {ticketDetails.payment_method === 'cash_on_arrival'
                            ? t.confirmCollectionButton
                            : t.activateButton}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Used Ticket Information */}
              {ticketDetails.message === 'Ticket already used' && (
                <div className="modern-used-ticket-info">
                  <div className="modern-used-ticket-header">❌ {t.ticketUsed}</div>
                  <div className="modern-used-ticket-details">
                    <div className="modern-used-ticket-detail">
                      <strong>Used By:</strong> {ticketDetails.used_by || 'Unknown'}
                    </div>
                    <div className="modern-used-ticket-detail">
                      <strong>Used At:</strong>{' '}
                      {ticketDetails.used_at
                        ? new Date(ticketDetails.used_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'Unknown'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="modern-instructions">
          <div className="modern-instructions-header">
            <div className="modern-icon">📋</div>
            <h3 className="modern-card-title">{t.instructionsTitle}</h3>
          </div>

          <div className="modern-instructions-grid">
            <div>
              {t.instructions.slice(0, Math.ceil(t.instructions.length / 2)).map((instruction, index) => (
                <div key={index} className="modern-instruction-item">
                  <div className="modern-instruction-number">{index + 1}</div>
                  <div className="modern-instruction-text">{instruction}</div>
                </div>
              ))}
            </div>

            <div>
              {t.instructions.slice(Math.ceil(t.instructions.length / 2)).map((instruction, index) => (
                <div key={index} className="modern-instruction-item">
                  <div className="modern-instruction-number">
                    {Math.ceil(t.instructions.length / 2) + index + 1}
                  </div>
                  <div className="modern-instruction-text">{instruction}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modern-footer">
          <div className="modern-footer-title">{t.title}</div>
          <div className="modern-footer-text">{t.footer}</div>
          <div className="modern-footer-support">📧 {t.support}</div>
        </div>
      </div>
    </div>
  );
};

export default PublicActivationPage;
