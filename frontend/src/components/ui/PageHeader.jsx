// The big title at the top of a page, with a short grey line under it.
//
// Usage:
//   <PageHeader title="Budget">Write down money you spend on this trip.</PageHeader>

function PageHeader(props) {
  return (
    <div className="page-header">
      <h1>{props.title}</h1>
      {props.children && <p className="muted">{props.children}</p>}
    </div>
  );
}

export default PageHeader;
