// A spinning circle with a short text, shown while a page loads its data.
//
// Usage:
//   <Loading text="Loading your trips..." />

function Loading(props) {
  return (
    <div className="loading">
      <div className="spinner" />
      <p className="muted">{props.text}</p>
    </div>
  );
}

export default Loading;
