import { NavLink } from "react-router-dom";
import { Info, Users, SlidersHorizontal, CalendarDays, Vote, Wallet } from "lucide-react";

function Sidebar(props) {
  const trip = props.trip;
  const tripLink = "/trips/" + trip._id;
  const isGroupTrip = trip.type === "group";

  return (
    <aside className="sidebar">
      <h3>{trip.title}</h3>
      <span className={"badge badge-" + trip.status}>{trip.status}</span>

      <NavLink to={tripLink} end>
        <Info size={18} /> Trip Details
      </NavLink>

      {isGroupTrip && (
        <NavLink to={tripLink + "/members"}>
          <Users size={18} /> Members
        </NavLink>
      )}

      <NavLink to={tripLink + "/preferences"}>
        <SlidersHorizontal size={18} /> My Preferences
      </NavLink>

      <NavLink to={tripLink + "/itinerary"}>
        <CalendarDays size={18} /> Itinerary
      </NavLink>

      {isGroupTrip && (
        <NavLink to={tripLink + "/consensus"}>
          <Vote size={18} /> Group Decisions
        </NavLink>
      )}

      <NavLink to={tripLink + "/budget"}>
        <Wallet size={18} /> Budget
      </NavLink>
    </aside>
  );
}

export default Sidebar;
