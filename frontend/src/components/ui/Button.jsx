// A button in the app's style.
//
// Usage:
//   <Button onClick={save}>Save</Button>                        -> red button
//   <Button variant="outline">Cancel</Button>                   -> white button with a red border
//   <Button variant="danger" size="small">Remove</Button>       -> small red "danger" button
//   <Button type="submit">Log in</Button>                       -> submits a form
//
// The colours and sizes are in index.css (button, .btn-outline, .btn-danger, .btn-small).

function Button(props) {
  // Pick the CSS classes from the "variant" and "size" props
  let className = "";

  if (props.variant === "outline") {
    className = "btn-outline";
  }
  if (props.variant === "danger") {
    className = "btn-danger";
  }
  if (props.size === "small") {
    className = className + " btn-small";
  }

  return (
    <button
      type={props.type}
      className={className.trim()}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  );
}

export default Button;
