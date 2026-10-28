import { Component } from 'react';
import type { ReactNode } from 'react';

export default class StatisticsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="rounded-3xl border border-gray-100 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">数据分析暂时未能加载，请检查网络后重新加载页面。</p>
        <button onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">重新加载</button>
      </div>
    );
  }
}
