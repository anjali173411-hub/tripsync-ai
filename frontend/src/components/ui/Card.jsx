// A white box with rounded corners and a soft shadow. Most page content sits in one.
//
// Usage:
//   <Card> ...anything... </Card>
//   <Card className="center"> ... </Card>    -> extra styles: center, notice, stat, hero ...
//
// The look is in index.css (.card).

function Card(props) {
  let className = "card";
  if (props.className) {
    className = "card " + props.className;
  }

  return <div className={className}>{props.children}</div>;
}

export default Card;
