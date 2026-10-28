import SmartModeControl from './SmartModeControl.tsx';
import NumberResults from './NumberResults.tsx';
import GenerationHistory from './GenerationHistory.tsx';
import RecentDraws from './RecentDraws.tsx';
import type { LottoGenerator } from '../hooks/useLottoGenerator.ts';
import type { LottoSet } from '../lib/lotto.ts';
import type { DrawLoadStatus, WinningDraw } from '../lib/draws.ts';

interface Props {
  generator: LottoGenerator;
  copiedId: string | null;
  draws: WinningDraw[];
  drawStatus: DrawLoadStatus;
  onRefresh: () => void;
  onCopy: (set: LottoSet) => void;
  onCopyAll: () => void;
}

export default function GeneratorView({ generator, copiedId, draws, drawStatus, onRefresh, onCopy, onCopyAll }: Props) {
  return (
    <>
      <SmartModeControl isSmartMode={generator.isSmartMode} onToggle={generator.toggleSmartMode} />
      <NumberResults currentSets={generator.currentSets} isGenerating={generator.isGenerating} copiedId={copiedId} onGenerate={generator.generateSets} onCopy={onCopy} onCopyAll={onCopyAll} />
      <GenerationHistory history={generator.history} copiedId={copiedId} onCopy={onCopy} onClear={generator.clearHistory} />
      <RecentDraws draws={draws} drawStatus={drawStatus} onRefresh={onRefresh} />
    </>
  );
}
