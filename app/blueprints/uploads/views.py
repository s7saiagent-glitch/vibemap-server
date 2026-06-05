"""
Uploads blueprint – file upload, type detection, parsing, and DB import.
"""
import os
import uuid
from datetime import datetime

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, jsonify, current_app,
)
from flask_babel import lazy_gettext as _l
from werkzeug.utils import secure_filename

from app import db
from app.models import UploadBatch
from app.utils.excel_parser import (
    parse_sales_detail_report,
    parse_productivity_report,
    parse_pending_invoices,
)
from app.utils.db_importer import (
    import_sales_detail,
    import_productivity,
    import_pending_invoices,
)

bp = Blueprint('uploads', __name__)

ALLOWED_EXTENSIONS = {'xls', 'xlsx', 'xlsm'}


def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _detect_file_type(filename: str, filepath: str) -> str:
    """
    Determine report type from filename.
    Priority:
      1. 'Pending Invoice' (case-insensitive) in filename → pending_invoices
      2. 'SALES_PRODUCTIVITY' in filename → productivity
      3. Everything else → sales_detail
    """
    name_upper = filename.upper()
    if 'PENDING INVOICE' in name_upper or 'PENDINGINVOICE' in name_upper:
        return 'pending_invoices'
    if 'SALES_PRODUCTIVITY' in name_upper or 'PRODUCTIVITY' in name_upper:
        return 'productivity'
    return 'sales_detail'


@bp.route('/')
def index():
    """Upload page with upload history."""
    batches = UploadBatch.query.order_by(UploadBatch.created_at.desc()).limit(50).all()
    return render_template(
        'uploads/index.html',
        batches=batches,
        page_title=_l('Upload Data'),
    )


@bp.route('/upload', methods=['POST'])
def upload():
    """
    Accept uploaded file, detect type, parse, and import to DB.
    Returns JSON with results (supports both AJAX and form submit).
    """
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or \
              request.accept_mimetypes.best == 'application/json'

    if 'file' not in request.files:
        msg = str(_l('No file part in the request.'))
        if is_ajax:
            return jsonify({'error': msg}), 400
        flash(msg, 'danger')
        return redirect(url_for('uploads.index'))

    file = request.files['file']

    if file.filename == '':
        msg = str(_l('No file selected.'))
        if is_ajax:
            return jsonify({'error': msg}), 400
        flash(msg, 'danger')
        return redirect(url_for('uploads.index'))

    if not _allowed_file(file.filename):
        msg = str(_l('Invalid file type. Allowed: xls, xlsx, xlsm.'))
        if is_ajax:
            return jsonify({'error': msg}), 400
        flash(msg, 'danger')
        return redirect(url_for('uploads.index'))

    batch_id = str(uuid.uuid4())[:8]
    original_filename = secure_filename(file.filename)
    # Prefix with batch_id to avoid collisions
    saved_filename = f'{batch_id}_{original_filename}'
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, saved_filename)
    file.save(filepath)

    file_type = _detect_file_type(original_filename, filepath)

    # Create a pending batch record so failures are logged
    batch_record = UploadBatch(
        batch_id=batch_id,
        filename=original_filename,
        file_type=file_type,
        status='processing',
    )
    db.session.add(batch_record)
    db.session.commit()

    try:
        if file_type == 'pending_invoices':
            parsed = parse_pending_invoices(filepath, batch_id=batch_id)
            if not parsed['records']:
                raise ValueError(str(_l('No records found in file.')))
            imported, skipped = import_pending_invoices(parsed)

        elif file_type == 'productivity':
            parsed = parse_productivity_report(filepath, batch_id=batch_id)
            if not parsed['records']:
                raise ValueError(str(_l('No records found in file.')))
            imported, skipped = import_productivity(parsed)

        else:  # sales_detail
            parsed = parse_sales_detail_report(filepath, batch_id=batch_id)
            if not parsed['records']:
                raise ValueError(str(_l('No records found in file.')))
            imported, skipped = import_sales_detail(parsed)

        # Update the batch record that was already committed inside importers
        # (importers create their own UploadBatch; update the one we created)
        batch_record.records_imported = imported
        batch_record.records_skipped = skipped
        batch_record.status = 'done'
        db.session.commit()

        result = {
            'success': True,
            'file_type': file_type,
            'imported': imported,
            'skipped': skipped,
            'batch_id': batch_id,
            'message': str(_l('Import complete: %(i)d imported, %(s)d skipped.',
                               i=imported, s=skipped)),
        }

        if is_ajax:
            return jsonify(result)

        flash(result['message'], 'success')
        return redirect(url_for('uploads.index'))

    except Exception as exc:  # noqa: BLE001
        batch_record.status = 'error'
        batch_record.error_message = str(exc)
        db.session.commit()
        error_msg = str(_l('Import failed: %(err)s', err=str(exc)))

        if is_ajax:
            return jsonify({'success': False, 'error': error_msg}), 500

        flash(error_msg, 'danger')
        return redirect(url_for('uploads.index'))


@bp.route('/history')
def history():
    """Full upload history page."""
    page = request.args.get('page', 1, type=int)
    batches = UploadBatch.query.order_by(
        UploadBatch.created_at.desc()
    ).paginate(page=page, per_page=30, error_out=False)

    return render_template(
        'uploads/history.html',
        batches=batches,
        page_title=_l('Upload History'),
    )


@bp.route('/delete/<int:batch_db_id>', methods=['POST'])
def delete_batch(batch_db_id):
    """Remove a batch record (does not delete imported data rows)."""
    batch = UploadBatch.query.get_or_404(batch_db_id)
    db.session.delete(batch)
    db.session.commit()
    flash(_l('Batch record deleted.'), 'success')
    return redirect(url_for('uploads.index'))
