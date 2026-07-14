import { useCallback, useRef } from 'react';
import { useI18n } from '../i18n/i18n';
import { useRecorder } from '../hooks/useRecorder';

export function PTTButton({ disabled, onPressStart, onPressEnd, onRecorded }) {
  const { t } = useI18n();
  const { isRecording, error, start, stop, cancel } = useRecorder();
  const activePointerId = useRef(null);

  const handleDown = useCallback(
    async (e) => {
      if (disabled || isRecording) return;
      e.preventDefault();
      activePointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      onPressStart?.();
      const ok = await start();
      if (!ok) onPressEnd?.();
    },
    [disabled, isRecording, start, onPressStart, onPressEnd]
  );

  const handleUp = useCallback(
    async (e) => {
      if (activePointerId.current === null) return;
      activePointerId.current = null;
      if (!isRecording) return;
      const result = await stop();
      onPressEnd?.();
      if (result) onRecorded?.(result);
    },
    [isRecording, stop, onPressEnd, onRecorded]
  );

  const handleCancel = useCallback(() => {
    if (activePointerId.current === null) return;
    activePointerId.current = null;
    cancel();
    onPressEnd?.();
  }, [cancel, onPressEnd]);

  return (
    <div className="ptt-wrap">
      <div className={`ptt-ring ${isRecording ? 'active' : ''}`} />
      <div className={`ptt-ring ${isRecording ? 'active' : ''}`} />
      <div className={`ptt-ring ${isRecording ? 'active' : ''}`} />
      <button
        type="button"
        className={`ptt-button ${isRecording ? 'recording' : ''} ${disabled ? 'locked-out' : ''}`}
        disabled={disabled}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerLeave={handleCancel}
        onPointerCancel={handleCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isRecording ? t('channel.recording') : t('channel.holdToTalk')}
      </button>
      {error && <p className="error-text">{t('channel.micDenied')}</p>}
    </div>
  );
}
