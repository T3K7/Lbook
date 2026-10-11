import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const binDir = path.resolve(projectRoot, 'bin');

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const ffmpegExePath = path.resolve(binDir, 'ffmpeg.exe');

console.log('🔍 Checking Windows FFmpeg binary...');
if (fs.existsSync(ffmpegExePath)) {
  const stats = fs.statSync(ffmpegExePath);
  console.log(`✅ Windows ffmpeg.exe already exists (${(stats.size / 1024 / 1024).toFixed(2)} MB).`);
} else {
  console.log('ℹ️ ffmpeg.exe not found in bin/. Creating documentation and placeholder instructions.');
  const readmeContent = `# FFmpeg Binary for Windows Packaging

Để đóng gói bản Windows (.exe) hoàn chỉnh cùng FFmpeg:
1. Tải bản build tĩnh của ffmpeg.exe từ nguồn chính thức của dự án FFmpeg (GPL/LGPL):
   - https://www.gyan.dev/ffmpeg/builds/ (ffmpeg-release-essentials.zip)
   - hoặc https://github.com/BtbN/FFmpeg-Builds/releases
2. Giải nén và đặt file \`ffmpeg.exe\` trực tiếp vào thư mục \`bin/ffmpeg.exe\`.
3. Chạy lệnh đóng gói: \`npm run electron:build\`.
   \`electron-builder\` sẽ tự động đưa \`bin/ffmpeg.exe\` vào thư mục \`resources/bin/ffmpeg.exe\` của bộ cài đặt Lbook-Setup.exe mà không bị mã hóa ASAR (đảm bảo thực thi nguyên bản).
`;
  fs.writeFileSync(path.resolve(binDir, 'README.txt'), readmeContent, 'utf-8');
}
