import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 前台 Tab 偽路由 → 全部指向首頁
      { source: '/dailypractice', destination: '/' },
      { source: '/mission', destination: '/' },
      { source: '/special', destination: '/' },
      { source: '/maze', destination: '/' },
      { source: '/shop', destination: '/' },
      { source: '/rank', destination: '/' },
      { source: '/stats', destination: '/' },
      { source: '/achievements', destination: '/' },
      { source: '/course', destination: '/' },
      { source: '/trial', destination: '/' },
      { source: '/history', destination: '/' },
      { source: '/captain', destination: '/' },
      { source: '/commandant', destination: '/' },
      { source: '/login', destination: '/' },
      { source: '/register', destination: '/' },
      // 後台偽路由（涵蓋所有子路徑）
      { source: '/admin', destination: '/' },
      { source: '/admin/:path*', destination: '/' },
    ];
  },
};

export default nextConfig;
