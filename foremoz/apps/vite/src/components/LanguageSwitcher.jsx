import { useI18n } from '../i18n.js';

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, supportedLanguages, t } = useI18n();

  return (
    <div
      className={`language-switcher${compact ? ' compact' : ''}`}
      role="group"
      aria-label={t('common.language')}
    >
      <span className="language-switcher-label">{t('common.language')}</span>
      <div className="language-switcher-buttons">
        {supportedLanguages.map((item) => (
          <button
            key={item}
            type="button"
            className={`btn ghost small${language === item ? ' active' : ''}`}
            onClick={() => setLanguage(item)}
          >
            {t(`common.language.${item}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
