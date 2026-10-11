
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Title, Text, TextInput, Button, Badge, Avatar, Group, Stack, Divider, Alert, Center, Loader } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Search, Mail, Send, UserMinus, X } from "lucide-react";
import api, { getErrorMessage, getCurrentUser } from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";

function MembersPage() {
  const { tripId } = useParams();
  const user = getCurrentUser();

  const [trip, setTrip] = useState(null);
  const [submittedUserIds, setSubmittedUserIds] = useState([]); 

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);

  // Invite by typing an email
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  // Runs when the page opens
  useEffect(() => {
    loadPage();
  }, [tripId]);

  async function loadPage() {
    try {
      const tripResponse = await api.get("/trips/" + tripId);
      const loadedTrip = tripResponse.data.trip;
      setTrip(loadedTrip);

      // Only the organiser is allowed to see everyone's preferences
      if (loadedTrip.organiser._id === user.id) {
        const prefResponse = await api.get("/trips/" + tripId + "/preferences");
        const preferences = prefResponse.data.preferences;

        const ids = [];
        for (let i = 0; i < preferences.length; i++) {
          ids.push(preferences[i].user._id);
        }
        setSubmittedUserIds(ids);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Sends an invitation to one email address
  async function sendInvite(emailToInvite) {
    setError("");
    setSending(true);

    try {
      const response = await api.post("/trips/" + tripId + "/members", { email: emailToInvite });
      notifications.show({ title: "Invite sent ✉️", message: response.data.message, color: "green" });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }

    setSending(false);
  }

  // Search people who already have an account
  async function handleSearch(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.get("/profile/search?q=" + encodeURIComponent(searchText));
      setSearchResults(response.data.users);
      setSearched(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Invite by the email typed in the box
  async function handleInviteByEmail(event) {
    event.preventDefault();
    await sendInvite(email);
    setEmail("");
  }

  // Organiser cancels an invitation that hasn't been answered
  function handleCancelInvite(invitedEmail) {
    modals.openConfirmModal({
      title: "Cancel this invitation?",
      centered: true,
      children: <Text size="sm">{invitedEmail + " will no longer be able to join this trip."}</Text>,
      labels: { confirm: "Cancel invite", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => cancelInvite(invitedEmail)
    });
  }

  async function cancelInvite(invitedEmail) {
    setError("");

    try {
      const response = await api.delete("/trips/" + tripId + "/invitations", {
        data: { email: invitedEmail }
      });
      notifications.show({ message: response.data.message });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Organiser removes a member
  function handleRemove(member) {
    modals.openConfirmModal({
      title: "Remove " + member.name + "?",
      centered: true,
      children: <Text size="sm">Their preferences and votes for this trip will be deleted.</Text>,
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => removeMember(member)
    });
  }

  async function removeMember(member) {
    setError("");

    try {
      const response = await api.delete("/trips/" + tripId + "/members/" + member._id);
      notifications.show({ message: response.data.message });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Is this person already in the trip or already invited?
  function isAlreadyAdded(person) {
    for (let i = 0; i < trip.members.length; i++) {
      if (trip.members[i]._id === person._id) {
        return true;
      }
    }
    return trip.invitedEmails.includes(person.email);
  }

  if (!trip) {
    if (error) {
      return <Alert color="red" variant="light">{error}</Alert>;
    }
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  const isOrganiser = trip.organiser._id === user.id;
  const canChangeMembers = isOrganiser && trip.status === "planning";

  return (
    <div className="trip-layout">
      <Sidebar trip={trip} />

      <section className="trip-content">
        <Title order={1}>Members</Title>
        <Text c="dimmed" mb="lg">Everyone in this trip, and the people you have invited.</Text>

        {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

        {/* Everyone in the trip */}
        <Card mb="lg">
          <Group justify="space-between" mb="sm">
            <Title order={3}>In this trip</Title>
            <Badge variant="light" size="lg">{trip.members.length} {trip.members.length === 1 ? "person" : "people"}</Badge>
          </Group>

          <Stack gap={0}>
            {trip.members.map((member) => (
              <Group key={member._id} justify="space-between" py="sm" className="member-row">
                <Group>
                  <Avatar color="maroon" radius="xl">{member.name.charAt(0).toUpperCase()}</Avatar>
                  <div>
                    <Group gap={6}>
                      <Text fw={700}>{member.name}</Text>
                      {member._id === trip.organiser._id && <Badge size="sm" color="yellow.5" c="dark.8">Organiser</Badge>}
                      {member._id === user.id && <Badge size="sm" variant="outline">You</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">{member.email}</Text>
                  </div>
                </Group>

                <Group gap="xs">
                  {isOrganiser && submittedUserIds.includes(member._id) && (
                    <Badge color="green" variant="light">Preferences ✓</Badge>
                  )}
                  {isOrganiser && !submittedUserIds.includes(member._id) && (
                    <Badge color="orange" variant="light">Preferences not filled yet</Badge>
                  )}
                  {canChangeMembers && member._id !== trip.organiser._id && (
                    <Button size="xs" variant="subtle" color="red" leftSection={<UserMinus size={14} />} onClick={() => handleRemove(member)}>
                      Remove
                    </Button>
                  )}
                </Group>
              </Group>
            ))}
          </Stack>

          {isOrganiser && (
            <Text c="dimmed" size="sm" mt="sm">Everyone must fill in preferences before you can generate the itinerary.</Text>
          )}
        </Card>

        {trip.invitedEmails.length > 0 && (
          <Card mb="lg">
            <Title order={3}>Waiting for reply</Title>
            <Text c="dimmed" size="sm" mb="sm">
              The itinerary can be generated once everyone invited has accepted or declined.
            </Text>

            {trip.invitedEmails.map((invitedEmail) => (
              <Group key={invitedEmail} justify="space-between" py="xs">
                <Group>
                  <Avatar radius="xl" color="gray"><Mail size={16} /></Avatar>
                  <Text>{invitedEmail}</Text>
                  <Badge color="orange" variant="light">Invited</Badge>
                </Group>
                {canChangeMembers && (
                  <Button size="xs" variant="subtle" color="gray" leftSection={<X size={14} />} onClick={() => handleCancelInvite(invitedEmail)}>
                    Cancel invite
                  </Button>
                )}
              </Group>
            ))}
          </Card>
        )}

        {/* Inviting people (organiser only, before the plan is final) */}
        {canChangeMembers && (
          <Card>
            <Title order={3} mb="xs">Invite people</Title>

            <form onSubmit={handleInviteByEmail}>
              <Group align="flex-end" wrap="nowrap">
                <TextInput
                  style={{ flex: 1 }}
                  label="Invite by email"
                  description="Works even if they don't have an account yet. They get an email with a link."
                  type="email"
                  placeholder="friend@example.com"
                  leftSection={<Mail size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" size="md" loading={sending} leftSection={<Send size={16} />}>Send</Button>
              </Group>
            </form>

            <Divider my="lg" label="or find someone already on TripSync AI" labelPosition="center" />

            <form onSubmit={handleSearch}>
              <Group align="flex-end" wrap="nowrap">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder="Search by name or email"
                  leftSection={<Search size={16} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  minLength={2}
                  required
                />
                <Button type="submit" size="md" variant="light">Search</Button>
              </Group>
            </form>

            {searched && searchResults.length === 0 && (
              <Text c="dimmed" size="sm" mt="sm">Nobody found. You can invite them by email above.</Text>
            )}

            {searchResults.map((person) => (
              <Group key={person._id} justify="space-between" mt="sm">
                <Group>
                  <Avatar radius="xl" color="maroon">{person.name.charAt(0).toUpperCase()}</Avatar>
                  <div>
                    <Text fw={600}>{person.name}</Text>
                    <Text size="sm" c="dimmed">{person.email}</Text>
                  </div>
                </Group>
                {isAlreadyAdded(person) ? (
                  <Badge variant="light" color="gray">Already added</Badge>
                ) : (
                  <Button size="xs" onClick={() => sendInvite(person.email)}>Invite</Button>
                )}
              </Group>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

export default MembersPage;
