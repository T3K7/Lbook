import React, { useState } from 'react';
import {
  SpellCheck,
  Plus,
  Trash2,
  Play,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import { Dictionary, DictionaryRule, SearchMode } from '../types';
import { preprocessTextForTts } from '../services/textPreprocessor';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface DictionaryViewProps {
  dictionaries: Dictionary[];
  onSaveDictionary: (dict: Dictionary) => void;
  onTestPronounce: (text: string) => void;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({
  dictionaries,
  onSaveDictionary,
  onTestPronounce,
}) => {
  const [selectedDictId, setSelectedDictId] = useState<string>(
    dictionaries[0]?.id || ''
  );
  const [testInputText, setTestInputText] = useState(
    'TS Nguyễn Văn A gặp BS Trần Văn B lúc 14:30 PM tại TP.HCM.'
  );

  // Add rule modal state
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newSearchTerm, setNewSearchTerm] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [newSearchMode, setNewSearchMode] = useState<SearchMode>('Exact');
  const [newCaseInsensitive, setNewCaseInsensitive] = useState(false);

  // Add new dict modal state
  const [showAddDictModal, setShowAddDictModal] = useState(false);
  const [newDictName, setNewDictName] = useState('');
  const [newDictDesc, setNewDictDesc] = useState('');

  const selectedDict =
    dictionaries.find((d) => d.id === selectedDictId) || dictionaries[0];

  const handleToggleRule = (ruleId: string) => {
    if (!selectedDict) return;
    const updatedRules = selectedDict.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    onSaveDictionary({ ...selectedDict, rules: updatedRules });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!selectedDict) return;
    const updatedRules = selectedDict.rules.filter((r) => r.id !== ruleId);
    onSaveDictionary({ ...selectedDict, rules: updatedRules });
  };

  const handleCreateRule = () => {
    if (!newSearchTerm.trim() || !selectedDict) return;
    const newRule: DictionaryRule = {
      id: `rule-${Date.now()}`,
      dictionaryId: selectedDict.id,
      searchTerm: newSearchTerm.trim(),
      replaceTerm: newReplacement.trim(),
      searchMode: newSearchMode,
      caseInsensitive: newCaseInsensitive,
      enabled: true,
    };

    const updatedRules = [...selectedDict.rules, newRule];
    onSaveDictionary({ ...selectedDict, rules: updatedRules });

    // Reset form
    setNewSearchTerm('');
    setNewReplacement('');
    setNewSearchMode('Exact');
    setNewCaseInsensitive(false);
    setShowAddRuleModal(false);
  };

  const handleCreateDict = () => {
    if (!newDictName.trim()) return;
    const newDict: Dictionary = {
      id: `dict-${Date.now()}`,
      name: newDictName.trim(),
      description: newDictDesc.trim() || 'Từ điển phát âm tùy chỉnh',
      isGlobal: true,
      rules: [],
      createdAt: new Date().toISOString(),
    };
    onSaveDictionary(newDict);
    setSelectedDictId(newDict.id);
    setNewDictName('');
    setNewDictDesc('');
    setShowAddDictModal(false);
  };

  // Preview test bench result
  const testOutputText = selectedDict
    ? preprocessTextForTts(testInputText, selectedDict.rules)
    : testInputText;

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 md:px-8 md:pt-8 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <SpellCheck className="w-5 h-5 text-[var(--accent)]" />
            <span>Từ Điển &amp; Quy Tắc Phát Âm TTS</span>
          </h1>
          <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Thay thế phát âm từ lóng, danh từ riêng, phiên âm tiếng nước ngoài hoặc chữ viết tắt
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddDictModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Tạo Từ Điển Mới
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Dictionary List Sidebar */}
        <div className="w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col shrink-0">
          <div className="p-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Các Bộ Từ Điển ({dictionaries.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dictionaries.map((dict) => (
              <button
                key={dict.id}
                onClick={() => setSelectedDictId(dict.id)}
                className={`w-full text-left p-3 rounded-xl text-xs transition-colors flex flex-col cursor-pointer ${
                  dict.id === selectedDict?.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] border border-transparent'
                }`}
              >
                <div className="font-semibold">{dict.name}</div>
                <div className="text-[11px] mt-0.5 line-clamp-1 opacity-70">
                  {dict.description}
                </div>
                <div className="mt-2 text-[10px] font-mono opacity-60">
                  {dict.rules.length} quy tắc · {dict.isGlobal ? 'Toàn cục' : 'Theo sách'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Rules & Test Bench Area */}
        {selectedDict ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-[var(--bg-app)]">
            {/* Dict Info Banner */}
            <Card padding="md" className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{selectedDict.name}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedDict.description}</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddRuleModal(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Thêm Quy Tắc
              </Button>
            </Card>

            {/* Live Test Bench */}
            <Card padding="md" className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Bàn Thử Nghiệm Phát Âm Trực Tiếp</span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onTestPronounce(testOutputText)}
                  leftIcon={<Play className="w-3.5 h-3.5 fill-current text-[var(--accent)]" />}
                >
                  Đọc Thử Câu Này
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Văn bản gốc cần thử nghiệm
                  </label>
                  <textarea
                    value={testInputText}
                    onChange={(e) => setTestInputText(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Kết quả đã qua bộ chuyển đổi từ điển
                  </label>
                  <div className="p-2.5 bg-[var(--bg-surface-secondary)] border border-[var(--border)] rounded-xl text-xs text-[var(--accent)] min-h-[58px] leading-relaxed font-medium">
                    {testOutputText}
                  </div>
                </div>
              </div>
            </Card>

            {/* Rules Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Danh sách quy tắc thay thế ({selectedDict.rules.length})
                </span>
              </div>

              {selectedDict.rules.length === 0 ? (
                <Card padding="lg" className="text-center text-xs text-[var(--text-muted)]">
                  Chưa có quy tắc phát âm nào trong bộ từ điển này. Nhấn "Thêm Quy Tắc" để tạo mới.
                </Card>
              ) : (
                <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)]">
                      <tr>
                        <th className="p-3 w-16 text-center">Bật/Tắt</th>
                        <th className="p-3">Từ / Mẫu tìm kiếm</th>
                        <th className="p-3">Đọc thành (Thay thế)</th>
                        <th className="p-3">Chế độ</th>
                        <th className="p-3 text-right">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {selectedDict.rules.map((rule) => (
                        <tr
                          key={rule.id}
                          className={`hover:bg-[var(--accent-soft)] transition-colors ${
                            !rule.enabled ? 'opacity-40' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleRule(rule.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
                            >
                              {rule.enabled ? (
                                <ToggleRight className="w-5 h-5 text-[var(--accent)]" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-medium text-[var(--text-primary)]">{rule.searchTerm}</td>
                          <td className="p-3 font-medium text-[var(--accent)]">
                            {rule.replaceTerm}
                          </td>
                          <td className="p-3 text-[var(--text-secondary)]">{rule.searchMode}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
            Chọn một bộ từ điển ở menu bên trái để chỉnh sửa
          </div>
        )}
      </div>

      {/* Modal Add Rule */}
      <Modal
        isOpen={showAddRuleModal}
        onClose={() => setShowAddRuleModal(false)}
        title="Thêm Quy Tắc Phát Âm Mới"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Từ / Ký tự cần thay thế (Search Term):
            </label>
            <input
              type="text"
              value={newSearchTerm}
              onChange={(e) => setNewSearchTerm(e.target.value)}
              placeholder="VD: BS, TS, VIP, MC..."
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Đọc thành (Phát âm thay thế):
            </label>
            <input
              type="text"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder="VD: Bác sĩ, Tiến sĩ, Víp..."
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Chế độ tìm kiếm:
            </label>
            <select
              value={newSearchMode}
              onChange={(e) => setNewSearchMode(e.target.value as SearchMode)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="Exact">Exact (Khớp nguyên từ chính xác)</option>
              <option value="Contains">Contains (Chứa cụm từ)</option>
              <option value="StartsWith">StartsWith (Bắt đầu bằng)</option>
              <option value="Regex">Regex (Biểu thức chính quy)</option>
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={newCaseInsensitive}
                onChange={(e) => setNewCaseInsensitive(e.target.checked)}
                className="accent-[var(--accent)] rounded"
              />
              <span>Không phân biệt chữ hoa / chữ thường (Case Insensitive)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="secondary" size="sm" onClick={() => setShowAddRuleModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRule}>
              Tạo Quy Tắc
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Add Dict */}
      <Modal
        isOpen={showAddDictModal}
        onClose={() => setShowAddDictModal(false)}
        title="Tạo Bộ Từ Điển Mới"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Tên bộ từ điển:
            </label>
            <input
              type="text"
              value={newDictName}
              onChange={(e) => setNewDictName(e.target.value)}
              placeholder="VD: Phiên âm Hán Việt, Danh từ Anime..."
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Mô tả ngắn:
            </label>
            <input
              type="text"
              value={newDictDesc}
              onChange={(e) => setNewDictDesc(e.target.value)}
              placeholder="VD: Chuẩn hóa phiên âm nhân vật..."
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="secondary" size="sm" onClick={() => setShowAddDictModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateDict}>
              Tạo Từ Điển
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
