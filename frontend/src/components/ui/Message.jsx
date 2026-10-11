// A red error message or a green success message.
// Shows nothing when the text is empty, so pages don't need to check first.
//
// Usage:
//   <Message type="error" text={error} />
//   <Message type="success" text={message} />

function Message(props) {
  if (!props.text) {
    return null;
  }

  return <p className={props.type}>{props.text}</p>;
}

export default Message;
