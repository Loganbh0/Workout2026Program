export default function TopNav({ title, left, right }) {
  return (
    <div className="topnav">
      {left && <div className="topnav__side topnav__side--left">{left}</div>}
      <span>{title}</span>
      {right && <div className="topnav__side topnav__side--right">{right}</div>}
    </div>
  );
}
