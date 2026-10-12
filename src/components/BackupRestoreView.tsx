import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { BackupService } from '../services/backupService';
import { StorageService } from '../services/storage';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useTranslation } from '../i18n';

interface BackupRestoreViewProps {
  onDataRestored: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ onDataRestored }) => {
  const { t } = useTranslation();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    try {
      const jsonContent = await BackupService.createFullBackupAsync();
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `StoryTTS_Backup_${new Date().toISOString().slice(0, 10)}.storytts`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: t('backup.exportSuccess'),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setStatusMessage({ type: 'error', text: msg ? `${t('common.error')}: ${msg}` : t('common.error') });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = BackupService.restoreBackup(text);

      if (result.success) {
        setStatusMessage({ type: 'success', text: t('backup.importSuccess') });
        onDataRestored();
      } else {
        setStatusMessage({ type: 'error', text: result.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setStatusMessage({ type: 'error', text: msg ? `${t('common.error')}: ${msg}` : t('common.error') });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = () => {
    localStorage.clear();
    StorageService.init();
    onDataRestored();
    setShowConfirmResetModal(false);
    setStatusMessage({
      type: 'success',
      text: t('backup.resetSuccess'),
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none text-[var(--text-primary)]">
      {/* Top Header */}
      <div
        className="p-4 md:px-8 md:pt-8 pb-3 border-b border-[var(--glass-border)] shrink-0 bg-[var(--glass-bg-header)] transition-all duration-300"
        style={{
          backdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        }}
      >
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {t('backup.title')}
        </h1>
        <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
          {t('backup.subtitle')}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                statusMessage.type === 'success'
                  ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)]'
                  : 'bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--danger)]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Backup & Restore Cards (Section 15) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Backup Card */}
            <Card padding="md" className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] mb-3">
                  <Download className="w-5 h-5 stroke-[2]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {t('backup.exportCardTitle')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {t('backup.exportCardDesc')}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleExportBackup}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  {t('backup.exportBtn')}
                </Button>
              </div>
            </Card>

            {/* 2. Restore Card */}
            <Card padding="md" className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] mb-3">
                  <Upload className="w-5 h-5 stroke-[2]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {t('backup.importCardTitle')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {t('backup.importCardDesc')}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".storytts,.json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  {t('backup.importBtn')}
                </Button>
              </div>
            </Card>
          </div>

          {/* Danger Zone (Section 15: Only dangerous actions use RED) */}
          <Card padding="md" className="border-[var(--danger)]/30 bg-[var(--danger-soft)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--danger)] uppercase tracking-wider mb-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>{t('backup.dangerZone')}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              {t('backup.resetCardDesc')}
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowConfirmResetModal(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {t('backup.resetBtn')}
            </Button>
          </Card>
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      <Modal
        isOpen={showConfirmResetModal}
        onClose={() => setShowConfirmResetModal(false)}
        title={t('backup.confirmResetTitle')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <p className="text-xs text-[var(--text-secondary)] text-center leading-relaxed">
            {t('backup.confirmResetDesc')}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowConfirmResetModal(false)}
            >
              {t('backup.cancel')}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleResetToDefault}
            >
              {t('backup.confirmReset')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
