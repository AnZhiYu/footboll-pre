import { Info, X } from 'lucide-react';
import {
  CONFIDENCE_INSIGHT_BANDS,
  PACE_INSIGHT_BANDS,
  XG_INSIGHT_BANDS,
  type MetricInsight,
} from '../lib/insights';

type InsightGuideModalProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

type InsightSectionProps = {
  title: string;
  items: MetricInsight[];
};

function InsightSection({ title, items }: InsightSectionProps) {
  return (
    <section className="insight-guide-section">
      <h3>{title}</h3>
      <div className="insight-guide-grid">
        {items.map((item) => (
          <article className="insight-guide-item" key={`${title}-${item.range}`}>
            <div>
              <span>{item.range}</span>
              <strong>{item.label}</strong>
            </div>
            <p>{item.tooltip}</p>
            <small>{item.bettingHint}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export function InsightGuideModal({ open, onOpen, onClose }: InsightGuideModalProps) {
  return (
    <>
      <button
        className="icon-button insight-help-button"
        type="button"
        aria-label="查看指标说明"
        title="查看指标说明"
        onClick={onOpen}
      >
        <Info size={18} />
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section className="insight-modal" role="dialog" aria-modal="true" aria-label="指标说明">
            <div className="insight-modal-heading">
              <div>
                <p>指标说明</p>
                <h2>xG / 节奏 / Top1 档位解读</h2>
              </div>
              <button className="icon-button" type="button" aria-label="关闭指标说明" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <InsightSection title="单队预期进球 xG" items={XG_INSIGHT_BANDS} />
            <InsightSection title="比赛节奏 PaceFactor" items={PACE_INSIGHT_BANDS} />
            <InsightSection title="Top1 精准比分置信度" items={CONFIDENCE_INSIGHT_BANDS} />
          </section>
        </div>
      ) : null}
    </>
  );
}
