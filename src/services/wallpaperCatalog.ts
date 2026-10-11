export interface WallpaperItem {
  id: string;
  name: string;
  subtitle: string;
  previewUrl: string;
  fullUrl: string;
  isCustom?: boolean;
}

export const WALLPAPER_CATALOG: WallpaperItem[] = [
  {
    id: 'donghua-fantasy',
    name: 'Tùy Chỉnh (Nữ Thần Đỏ)',
    subtitle: 'Nhân vật huyền huyễn 3D Đông Hoa',
    previewUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=85&w=1920',
  },
  {
    id: 'emerald-silk',
    name: 'Thanh Lịch (Mặc Định)',
    subtitle: 'Lụa ngọc lục bảo uốn lượn mượt mà',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=85&w=1920',
  },
  {
    id: 'melody-art',
    name: 'Giai Điệu',
    subtitle: 'Nghệ thuật âm sắc và luồng ánh sáng',
    previewUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=85&w=1920',
  },
  {
    id: 'vintage-parchment',
    name: 'Trống / Giấy Cổ',
    subtitle: 'Vân giấy cổ phong thư hương nhã nhặn',
    previewUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=85&w=1920',
  },
  {
    id: 'midnight-aurora',
    name: 'Đen Tuyền',
    subtitle: 'Không gian tĩnh lặng, xanh đen sâu thẳm',
    previewUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&q=85&w=1920',
  },
];

export function getActiveWallpaperUrl(wallpaperId: string, customUrl?: string): string {
  if (wallpaperId === 'custom' && customUrl) {
    return customUrl;
  }
  const found = WALLPAPER_CATALOG.find((w) => w.id === wallpaperId);
  return found?.fullUrl || WALLPAPER_CATALOG[0].fullUrl;
}
