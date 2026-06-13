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
    # Arabic only mode – ignore browser language preference
    return 'ar'


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

    _register_cli(app)
    return app


def _register_cli(app):
    import click

    @app.cli.command('dedup-employees')
    def dedup_employees():
        """Auto-merge duplicate employee records that share the same SAP ID."""
        from app.models import (Employee, EmployeeAlias, SaleRecord,
                                SalesProductivityRecord, PendingInvoice,
                                SalesTarget, Schedule)

        # Group employees by SAP ID
        from collections import defaultdict
        groups = defaultdict(list)
        for emp in Employee.query.filter(Employee.sap_id.isnot(None)).all():
            groups[emp.sap_id].append(emp)

        merged_count = 0
        for sap_id, emps in groups.items():
            if len(emps) < 2:
                continue

            # Keep the one with most sales records
            emps.sort(key=lambda e: SaleRecord.query.filter_by(employee_id=e.id).count(), reverse=True)
            target = emps[0]

            for source in emps[1:]:
                click.echo(f'Merging "{source.name}" (id={source.id}) → "{target.name}" (id={target.id}) [SAP {sap_id}]')

                SaleRecord.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
                SalesProductivityRecord.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
                PendingInvoice.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
                SalesTarget.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
                Schedule.query.filter_by(employee_id=source.id).update({'employee_id': target.id})

                for alias in list(source.aliases):
                    exists = EmployeeAlias.query.filter_by(alias=alias.alias, employee_id=target.id).first()
                    if not exists:
                        alias.employee_id = target.id
                    else:
                        db.session.delete(alias)

                if source.name != target.name:
                    if not EmployeeAlias.query.filter_by(alias=source.name, employee_id=target.id).first():
                        db.session.add(EmployeeAlias(employee_id=target.id, alias=source.name))

                db.session.delete(source)
                merged_count += 1

        db.session.commit()
        if merged_count:
            click.echo(f'Done. Merged {merged_count} duplicate record(s).')
        else:
            click.echo('No duplicates found by SAP ID.')


def _seed_settings():
    from app.models import AppSetting
    defaults = {
        'working_days_per_month': '26',
        'performance_drop_threshold': '-10',
        'branch_name': 'JED MO Abhour Plaza',
        'company_name': 'Magrabi - KSA',
        'branch_manager_name': 'أحمد قحطاني',
    }
    for key, val in defaults.items():
        if not AppSetting.query.filter_by(key=key).first():
            db.session.add(AppSetting(key=key, value=val))
    db.session.commit()
