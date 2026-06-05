"""
Assistant blueprint – SahsPro bilingual sales assistant chat interface.
"""
from flask import (
    Blueprint, render_template, request, jsonify, session,
)
from flask_babel import lazy_gettext as _l

from app.utils.assistant import SahsPro, generate_sales_advice

bp = Blueprint('assistant', __name__)

# Module-level assistant instance (stateless, safe to share)
_assistant = SahsPro()


def _get_lang() -> str:
    """Determine active language from session."""
    lang = session.get('language', 'ar')
    return lang if lang in ('ar', 'en') else 'ar'


@bp.route('/')
def index():
    """Chat interface page."""
    lang = _get_lang()

    # Pre-load advice cards to show alongside chat
    try:
        advice_list = generate_sales_advice(lang=lang)
    except Exception:
        advice_list = []

    # Greeting message in correct language
    if lang == 'ar':
        greeting = ('مرحباً! أنا ساهس برو، مساعدك الذكي لتحليل المبيعات. '
                    'يمكنك سؤالي عن المبيعات، الأهداف، الفواتير المعلقة، وأداء الموظفين.')
    else:
        greeting = ('Hello! I\'m Sahs Pro, your intelligent sales analysis assistant. '
                    'Ask me about sales, targets, pending invoices, or employee performance.')

    return render_template(
        'assistant/index.html',
        greeting=greeting,
        advice_list=advice_list,
        lang=lang,
        page_title=_l('Sahs Pro Assistant'),
    )


@bp.route('/chat', methods=['POST'])
def chat():
    """AJAX endpoint: receive user message, return assistant JSON response."""
    data = request.get_json(silent=True) or {}
    question = (data.get('message') or request.form.get('message', '')).strip()
    lang = data.get('lang') or request.form.get('lang') or _get_lang()

    if not question:
        return jsonify({
            'success': False,
            'error': str(_l('Please enter a message.')),
        }), 400

    try:
        answer = _assistant.answer(question=question, lang=lang)
        return jsonify({
            'success': True,
            'question': question,
            'answer': answer,
            'lang': lang,
        })
    except Exception as exc:  # noqa: BLE001
        return jsonify({
            'success': False,
            'error': str(_l('Assistant error: %(err)s', err=str(exc))),
        }), 500


@bp.route('/advice')
def advice():
    """Standalone advice page (also accessible from dashboard)."""
    lang = _get_lang()
    try:
        advice_list = generate_sales_advice(lang=lang)
    except Exception:
        advice_list = []

    return render_template(
        'assistant/advice.html',
        advice_list=advice_list,
        lang=lang,
        page_title=_l('Sales Advice'),
    )
