import { useNavigate } from 'react-router-dom';
import logoMark from '../assets/logo-mark.svg';
import { useI18n } from '../i18n/i18n';

export function Header({ title, onBack, right }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button className="btn-secondary btn" style={{ padding: '6px 10px' }} onClick={onBack || (() => navigate(-1))}>
            {t('common.back')}
          </button>
        )}
        {!onBack && <img src={logoMark} alt={t('app.name')} width={32} height={32} style={{ borderRadius: '50%' }} />}
        <h3 style={{ margin: 0 }}>{title || t('app.name')}</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        <button
          className="btn-secondary btn"
          style={{ padding: '4px 8px', fontSize: 12 }}
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>
    </div>
  );
}
