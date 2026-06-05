/* Sahs Pro - Main JavaScript */

// ─── Target Distribution ───────────────────────────────────────────────────
function updateTargetAmounts() {
  const totalInput = document.getElementById('company_total');
  if (!totalInput) return;
  const total = parseFloat(totalInput.value) || 0;
  let sumPct = 0;

  document.querySelectorAll('.pct-input').forEach(inp => {
    const pct = parseFloat(inp.value) || 0;
    sumPct += pct;
    const row = inp.closest('tr');
    if (row) {
      const amtCell = row.querySelector('.calc-amount');
      if (amtCell) {
        const amount = (total * pct / 100).toFixed(2);
        amtCell.textContent = Number(amount).toLocaleString('ar-SA');
      }
    }
  });

  const sumEl = document.getElementById('pct-sum');
  if (sumEl) {
    sumEl.textContent = sumPct.toFixed(1) + '%';
    sumEl.className = Math.abs(sumPct - 100) < 0.1 ? 'text-success fw-bold' : 'text-danger fw-bold';
  }

  const saveBtn = document.getElementById('save-targets-btn');
  if (saveBtn) {
    saveBtn.disabled = Math.abs(sumPct - 100) >= 0.1;
  }
}

// ─── Chat Assistant ─────────────────────────────────────────────────────────
function initChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const container = document.getElementById('chat-messages');
  const typingEl = document.getElementById('typing-indicator');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    appendMessage(question, 'user');
    input.value = '';
    if (typingEl) typingEl.style.display = 'block';

    try {
      const res = await fetch('/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      if (typingEl) typingEl.style.display = 'none';
      appendMessage(data.answer || data.error || '...', 'bot');
    } catch (err) {
      if (typingEl) typingEl.style.display = 'none';
      appendMessage('حدث خطأ. حاول مرة أخرى. / An error occurred.', 'bot');
    }
  });

  document.querySelectorAll('.quick-question').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.q;
      form.dispatchEvent(new Event('submit'));
    });
  });
}

function appendMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `d-flex mb-2 ${sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`;
  div.innerHTML = `<div class="chat-bubble ${sender}">${text.replace(/\n/g, '<br>')}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ─── File Upload ─────────────────────────────────────────────────────────────
function initUpload() {
  const form = document.getElementById('upload-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> جاري الرفع...';

    const fd = new FormData(form);
    try {
      const res = await fetch('/uploads/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        showAlert(`تم الاستيراد: ${data.imported} سجل، تم تخطي: ${data.skipped}`, 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        showAlert(data.error || 'حدث خطأ', 'danger');
      }
    } catch (err) {
      showAlert('خطأ في الاتصال', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i> رفع الملف';
    }
  });
}

// ─── Charts ─────────────────────────────────────────────────────────────────
async function loadEmployeeCharts(employeeId) {
  try {
    const [monthly, categories] = await Promise.all([
      fetch(`/api/employee/${employeeId}/yearly-sales`).then(r => r.json()),
      fetch(`/api/employee/${employeeId}/category-breakdown`).then(r => r.json()),
    ]);

    if (document.getElementById('monthly-chart')) {
      new Chart(document.getElementById('monthly-chart'), {
        type: 'line',
        data: {
          labels: monthly.labels,
          datasets: [{
            label: 'المبيعات / Sales',
            data: monthly.values,
            borderColor: '#1a56db',
            backgroundColor: 'rgba(26,86,219,.1)',
            tension: .4,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } },
        }
      });
    }

    if (document.getElementById('category-chart')) {
      new Chart(document.getElementById('category-chart'), {
        type: 'doughnut',
        data: {
          labels: categories.labels,
          datasets: [{
            data: categories.values,
            backgroundColor: ['#1a56db','#057a55','#c27803','#c81e1e','#7c3aed','#0891b2'],
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right' } } },
      });
    }
  } catch (err) {
    console.error('Chart load error:', err);
  }
}

async function loadDashboardCharts() {
  try {
    const res = await fetch('/api/targets/chart');
    const data = await res.json();
    const el = document.getElementById('target-chart');
    if (!el || !data.labels) return;

    new Chart(el, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          { label: 'الهدف / Target', data: data.targets, backgroundColor: 'rgba(26,86,219,.6)' },
          { label: 'المحقق / Achieved', data: data.achieved, backgroundColor: 'rgba(5,122,85,.6)' },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } },
      }
    });
  } catch (err) {
    console.error('Dashboard chart error:', err);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCsrfToken() {
  const meta = document.querySelector('meta[name=csrf-token]');
  return meta ? meta.content : '';
}

function showAlert(msg, type = 'info') {
  const container = document.getElementById('alert-container') || document.body;
  const div = document.createElement('div');
  div.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  div.style.zIndex = 9999;
  div.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initUpload();

  // Target page
  document.querySelectorAll('.pct-input').forEach(inp => {
    inp.addEventListener('input', updateTargetAmounts);
  });
  const totalInput = document.getElementById('company_total');
  if (totalInput) totalInput.addEventListener('input', updateTargetAmounts);
  updateTargetAmounts();

  // Dashboard charts
  if (document.getElementById('target-chart')) loadDashboardCharts();

  // Employee page
  const empSelect = document.getElementById('employee-selector');
  if (empSelect) {
    const empId = empSelect.value;
    if (empId) loadEmployeeCharts(empId);
    empSelect.addEventListener('change', () => loadEmployeeCharts(empSelect.value));
  }
});
