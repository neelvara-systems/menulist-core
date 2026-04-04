import { getCookie } from 'cookies-next';
import { APP_LOCALE_COOKIES_KEY } from './config';

type MobileUiLocaleText = {
    cancel: string;
    close: string;
    confirm: string;
    select: string;
    fullscreenEnabled: string;
    fullscreenDisabled: string;
    fullscreenUnsupported: string;
};

const FALLBACK_LOCALE = 'en-US';

const MOBILE_UI_LOCALE_MAP: Record<string, MobileUiLocaleText> = {
    'en-US': {
        cancel: 'Cancel',
        close: 'Close',
        confirm: 'Confirm',
        select: 'Select',
        fullscreenEnabled: 'Fullscreen mode enabled',
        fullscreenDisabled: 'Fullscreen mode disabled',
        fullscreenUnsupported: 'Your browser does not support fullscreen mode',
    },
    'en-GB': {
        cancel: 'Cancel',
        close: 'Close',
        confirm: 'Confirm',
        select: 'Select',
        fullscreenEnabled: 'Fullscreen mode enabled',
        fullscreenDisabled: 'Fullscreen mode disabled',
        fullscreenUnsupported: 'Your browser does not support fullscreen mode',
    },
    'hi-IN': {
        cancel: 'रद्द करें',
        close: 'बंद करें',
        confirm: 'पुष्टि करें',
        select: 'चुनें',
        fullscreenEnabled: 'फुल स्क्रीन मोड चालू हो गया',
        fullscreenDisabled: 'फुल स्क्रीन मोड बंद हो गया',
        fullscreenUnsupported: 'आपका ब्राउज़र फुल स्क्रीन मोड को समर्थन नहीं देता',
    },
    'ar-SA': {
        cancel: 'إلغاء',
        close: 'إغلاق',
        confirm: 'تأكيد',
        select: 'اختيار',
        fullscreenEnabled: 'تم تفعيل وضع ملء الشاشة',
        fullscreenDisabled: 'تم إيقاف وضع ملء الشاشة',
        fullscreenUnsupported: 'متصفحك لا يدعم وضع ملء الشاشة',
    },
    'es-ES': {
        cancel: 'Cancelar',
        close: 'Cerrar',
        confirm: 'Confirmar',
        select: 'Seleccionar',
        fullscreenEnabled: 'Modo de pantalla completa activado',
        fullscreenDisabled: 'Modo de pantalla completa desactivado',
        fullscreenUnsupported: 'Tu navegador no es compatible con el modo de pantalla completa',
    },
    'ta-IN': {
        cancel: 'ரத்து செய்',
        close: 'மூடு',
        confirm: 'உறுதிப்படுத்து',
        select: 'தேர்வு செய்',
        fullscreenEnabled: 'முழுத்திரை முறை இயக்கப்பட்டது',
        fullscreenDisabled: 'முழுத்திரை முறை நிறுத்தப்பட்டது',
        fullscreenUnsupported: 'உங்கள் உலாவி முழுத்திரை முறையை ஆதரிக்காது',
    },
    'te-IN': {
        cancel: 'రద్దు చేయండి',
        close: 'మూసివేయండి',
        confirm: 'నిర్ధారించండి',
        select: 'ఎంచుకోండి',
        fullscreenEnabled: 'పూర్తి తెర మోడ్ ప్రారంభించబడింది',
        fullscreenDisabled: 'పూర్తి తెర మోడ్ నిలిపివేయబడింది',
        fullscreenUnsupported: 'మీ బ్రౌజర్ పూర్తి తెర మోడ్‌కు మద్దతు ఇవ్వదు',
    },
    'mr-IN': {
        cancel: 'रद्द करा',
        close: 'बंद करा',
        confirm: 'पुष्टी करा',
        select: 'निवडा',
        fullscreenEnabled: 'फुलस्क्रीन मोड सुरू झाला',
        fullscreenDisabled: 'फुलस्क्रीन मोड बंद झाला',
        fullscreenUnsupported: 'तुमचा ब्राउझर फुलस्क्रीन मोडला समर्थन देत नाही',
    },
    'bn-IN': {
        cancel: 'বাতিল করুন',
        close: 'বন্ধ করুন',
        confirm: 'নিশ্চিত করুন',
        select: 'নির্বাচন করুন',
        fullscreenEnabled: 'ফুলস্ক্রিন মোড চালু হয়েছে',
        fullscreenDisabled: 'ফুলস্ক্রিন মোড বন্ধ হয়েছে',
        fullscreenUnsupported: 'আপনার ব্রাউজার ফুলস্ক্রিন মোড সমর্থন করে না',
    },
};

export function getMobileUiLocaleText(locale?: string): MobileUiLocaleText {
    const cookieLocale = getCookie(APP_LOCALE_COOKIES_KEY);
    const activeLocale = locale || (typeof cookieLocale === 'string' ? cookieLocale : FALLBACK_LOCALE);
    return MOBILE_UI_LOCALE_MAP[activeLocale] || MOBILE_UI_LOCALE_MAP[FALLBACK_LOCALE];
}
