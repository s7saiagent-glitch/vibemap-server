import os
from flask import Flask, session, request, g
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_babel import Babel, get_locale
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect

db = SQLAlchemy()
migrate = Migrate()
babel = Babel()
mail = Mail()
csrf = CSRFProtect()


def get_locale_selector():
    lang = session.get('language')
    if lang and lang in ['ar', 'en']:
        return lang
    return request.accept_languages.best_match(['ar', 'en'], default='ar')


def create_app(config_name=None):
    app = Flask(__name__, instance_relative_config=True)

    from app.config import config_map
    env = config_name or os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config_map.get(env, config_map['default']))

    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    babel.init_app(app, locale_selector=get_locale_selector)
    mail.init_app(app)
    csrf.init_app(app)

    from app.blueprints.dashboard import bp as dashboard_bp
    from app.blueprints.employees import bp as employees_bp
    from app.blueprints.uploads import bp as uploads_bp
    from app.blueprints.targets import bp as targets_bp
    from app.blueprints.reports import bp as reports_bp
    from app.blueprints.invoices import bp as invoices_bp
    from app.blueprints.schedule import bp as schedule_bp
    from app.blueprints.assistant import bp as assistant_bp
    from app.blueprints.api import bp as api_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(employees_bp, url_prefix='/employees')
    app.register_blueprint(uploads_bp, url_prefix='/uploads')
    app.register_blueprint(targets_bp, url_prefix='/targets')
    app.register_blueprint(reports_bp, url_prefix='/reports')
    app.register_blueprint(invoices_bp, url_prefix='/invoices')
    app.register_blueprint(schedule_bp, url_prefix='/schedule')
    app.register_blueprint(assistant_bp, url_prefix='/assistant')
    app.register_blueprint(api_bp, url_prefix='/api')

    # Exempt AJAX-only endpoints from CSRF (they use JSON, not forms)
    csrf.exempt(assistant_bp)
    csrf.exempt(api_bp)

    @app.route('/set-language/<lang>')
    def set_language(lang):
        from flask import redirect, url_for
        if lang in ['ar', 'en']:
            session['language'] = lang
        return redirect(request.referrer or url_for('dashboard.index'))

    @app.context_processor
    def inject_globals():
        from flask_babel import get_locale
        return {
            'current_locale': str(get_locale()),
            'languages': app.config.get('LANGUAGES', {}),
        }

    with app.app_context():
        db.create_all()
        _seed_settings()

    return app


def _seed_settings():
    from app.models import AppSetting
    defaults = {
        'working_days_per_month': '26',
        'performance_drop_threshold': '-10',
        'branch_name': 'JED MO Abhour Plaza',
        'company_name': 'Magrabi - KSA',
    }
    for key, val in defaults.items():
        if not AppSetting.query.filter_by(key=key).first():
            db.session.add(AppSetting(key=key, value=val))
    db.session.commit()
