import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../hooks/useAuth';
import logoWordmark from '../assets/logo-wordmark.svg';

export function LoginPage() {
  const { t } = useI18n();
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, code, name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <img src={logoWordmark} alt={t('app.name')} style={{ width: 220, marginBottom: 8 }} />
      <p className="muted" style={{ textAlign: 'center' }}>{t('app.tagline')}</p>

      <div className="card" style={{ width: '100%' }}>
        {step === 'phone' && (
          <form onSubmit={handleRequestOtp}>
            <label>{t('auth.phone.label')}</label>
            <input
              type="tel"
              placeholder={t('auth.phone.placeholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{ marginTop: 6, marginBottom: 12 }}
            />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? t('common.loading') : t('auth.otp.request')}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify}>
            <p className="muted">{t('auth.otp.sentHint')}</p>
            <label>{t('auth.otp.label')}</label>
            <input
              type="tel"
              placeholder={t('auth.otp.placeholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{ marginTop: 6, marginBottom: 12 }}
            />
            <label>{t('auth.name.label')}</label>
            <input
              type="text"
              placeholder={t('auth.name.placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginTop: 6, marginBottom: 12 }}
            />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? t('common.loading') : t('auth.otp.verify')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
