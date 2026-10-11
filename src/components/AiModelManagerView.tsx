import React, { useState } from 'react';
import { Cpu, Download, CheckCircle, Play, Sparkles } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface AiModelInfo {
  id: string;
  name: string;
  displayName: string;
  language: string;
  fileSizeMb: number;
  sampleRate: number;
  description: string;
  modelName: string;
  downloadStatus: 'not_downloaded' | 'downloading' | 'ready';
  downloadProgress?: number;
}

interface AiModelManagerViewProps {
  onTestVoice: (sampleText: string) => void;
}

export const AiModelManagerView: React.FC<AiModelManagerViewProps> = ({ onTestVoice }) => {
  const [models, setModels] = useState<AiModelInfo[]>([
    {
      id: 'vi-vits-female-huyen',
      name: 'vi_VN-huyen-medium',
      displayName: 'Huyền My (Nữ - Truyền Cảm)',
      language: 'vi-VN',
      fileSizeMb: 62.4,
      sampleRate: 22050,
      description: 'Mô hình giọng đọc nữ nhẹ nhàng, âm sắc tự nhiên, thích hợp truyện đô thị tình cảm.',
      modelName: 'vi_VN-huyen-medium.onnx',
      downloadStatus: 'ready',
    },
    {
      id: 'vi-vits-male-quan',
      name: 'vi_VN-quan-medium',
      displayName: 'Minh Quân (Nam - Hào Sảng)',
      language: 'vi-VN',
      fileSizeMb: 64.8,
      sampleRate: 22050,
      description: 'Mô hình giọng đọc nam dứt khoát, âm vực cao, phù hợp kiếm hiệp, lịch sử, quân sự.',
      modelName: 'vi_VN-quan-medium.onnx',
      downloadStatus: 'not_downloaded',
    },
  ]);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadModel = (modelId: string) => {
    setDownloadingId(modelId);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId
            ? { ...m, downloadStatus: 'downloading', downloadProgress: currentProgress }
            : m
        )
      );

      if (currentProgress >= 100) {
        clearInterval(interval);
        setModels((prev) =>
          prev.map((m) =>
            m.id === modelId
              ? { ...m, downloadStatus: 'ready', downloadProgress: 100 }
              : m
          )
        );
        setDownloadingId(null);
      }
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 md:px-8 md:pt-8 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--accent)]" />
            <span>Mô Hình Giọng Đọc AI Offline (Piper / ONNX)</span>
          </h1>
          <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Quản lý gói mô hình nén chạy trực tiếp trên chip Windows không cần kết nối mạng
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Architecture Overview Banner */}
          <Card padding="md">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Kiến Trúc Bộ Máy Offline C# .NET WPF</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Lbook tích hợp sẵn bộ tương thích mô hình ONNX Runtime C# (.NET 8). Các tệp mô hình được lưu trữ trong thư mục <code className="text-[var(--accent)] font-mono">/Models</code> của ứng dụng Windows, cho phép đọc sách hoàn toàn không cần Internet với tốc độ xử lý câu dưới 50ms.
            </p>
          </Card>

          {/* Model Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map((model) => {
              const isReady = model.downloadStatus === 'ready';
              const isDownloading = model.downloadStatus === 'downloading' || downloadingId === model.id;

              return (
                <Card
                  key={model.id}
                  padding="md"
                  className="flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{model.displayName}</h3>
                      {isReady ? (
                        <span className="text-[11px] text-[var(--accent)] flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Sẵn sàng</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                          Chưa tải về
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1 font-mono">
                      <span>{model.language}</span>
                      <span aria-hidden="true">·</span>
                      <span>{model.fileSizeMb} MB</span>
                      <span aria-hidden="true">·</span>
                      <span>{model.sampleRate} Hz</span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed">
                      {model.description}
                    </p>

                    <div className="mt-3 text-[11px] text-[var(--text-muted)] font-mono">
                      Tệp mô hình: {model.modelName}
                    </div>

                    {isDownloading && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[var(--accent)]">
                          <span>Đang nạp mô hình vào bộ nhớ đệm...</span>
                          <span className="font-mono">{model.downloadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] transition-all duration-300"
                            style={{ width: `${model.downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        onTestVoice(
                          `Đây là giọng đọc thử nghiệm của mô hình ${model.displayName}. Âm điệu mượt mà và chân thực.`
                        )
                      }
                      className="flex-1"
                      leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                    >
                      Nghe Giọng Mẫu
                    </Button>

                    {!isReady && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownloadModel(model.id)}
                        disabled={isDownloading}
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                      >
                        {isDownloading ? 'Đang tải...' : 'Tải Về'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
