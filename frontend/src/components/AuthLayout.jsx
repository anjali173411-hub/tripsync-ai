// The split-screen layout for the Log in and Sign up pages.
// Left: what TripSync AI does. Right: the form (passed in as children).
// Usage: <AuthLayout> ...form... </AuthLayout>

import { Leaf, Sparkles, Handshake, Wallet } from "lucide-react";

function AuthLayout(props) {
  return (
    <div className="auth-page">
      {/* Left side: the app's story */}
      <section className="auth-story">
        <div className="auth-brand">
          <span className="brand-icon"><Leaf size={22} /></span>
          TripSync AI
        </div>

        <div>
          <h1>Plan trips together.<br />Let AI sort the rest.</h1>
          <p className="auth-lead">
            Everyone shares what they want. TripSync AI turns it into one day-by-day plan
            the whole group is happy with.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="auth-feature-icon"><Sparkles size={18} /></span>
              <div>
                <b>AI day-by-day itinerary</b>
                <small>Meals, stay and travel times included</small>
              </div>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-icon"><Handshake size={18} /></span>
              <div>
                <b>Fair group decisions</b>
                <small>The AI finds clashes, everyone votes</small>
              </div>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-icon"><Wallet size={18} /></span>
              <div>
                <b>Shared budget</b>
                <small>See who paid what, stay within budget</small>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-footnote">Plan your perfect trip together</p>
      </section>

      {/* Right side: the form */}
      <section className="auth-form-side">
        <div className="auth-form-card">{props.children}</div>
      </section>
    </div>
  );
}

export default AuthLayout;
