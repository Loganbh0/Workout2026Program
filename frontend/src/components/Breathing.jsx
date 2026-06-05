import './Breathing.css';

// CSS-driven breathing marker (no GIF needed): a soft circle that scales and
// fades on a calm ~8s cycle, with a synced "Breathe in / out" caption.
export default function Breathing() {
  return (
    <div className="breathing">
      <div className="breathing__ring breathing__ring--outer" />
      <div className="breathing__ring breathing__ring--mid" />
      <div className="breathing__core" />
    </div>
  );
}
