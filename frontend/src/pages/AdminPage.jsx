// Admin dashboard (FR-10): platform numbers, popular destinations, and all user accounts.
// Built with Mantine components (Paper, SimpleGrid, Progress, Table, Badge ...).

import { useEffect, useState } from "react";
import { Paper, Card, Title, Text, Button, Badge, Avatar, Group, Stack, SimpleGrid, Table, Progress, Alert, ThemeIcon } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Users, Plane, User, UsersRound, Ruler, Clock, CheckCircle2 } from "lucide-react";
import api, { getErrorMessage, getCurrentUser, formatDate } from "../api/axios.js";
import { confirmAction } from "../components/ui/confirm.jsx";

function AdminPage() {
  const user = getCurrentUser();

  const [summary, setSummary] = useState(null); // totalUsers, totalTrips, planningTrips, completedTrips ...
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  // Runs once when the page opens
  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const summaryResponse = await api.get("/admin/summary");
      setSummary(summaryResponse.data);

      const usersResponse = await api.get("/admin/users");
      setUsers(usersResponse.data.users);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Turn a user account on or off - first asks "Are you sure?"
  function handleToggleActive(account) {
    let action = "Activate";
    if (account.isActive) {
      action = "Deactivate";
    }

    confirmAction({
      title: action + " " + account.name + "?",
      text: account.isActive
        ? "They will be logged out and won't be able to log in until you activate them again."
        : "They will be able to log in again.",
      confirmLabel: action,
      danger: account.isActive,
      onConfirm: () => toggleActive(account)
    });
  }

  async function toggleActive(account) {
    try {
      await api.patch("/admin/users/" + account._id + "/status", {
        isActive: !account.isActive
      });
      notifications.show({ message: account.name + (account.isActive ? " deactivated" : " activated") });
      loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // The number tiles: icon, number and label
  let tiles = [];
  if (summary) {
    tiles = [
      { icon: <Users size={20} />, value: summary.totalUsers, label: "Users" },
      { icon: <Plane size={20} />, value: summary.totalTrips, label: "Trips" },
      { icon: <User size={20} />, value: summary.soloTrips, label: "Solo trips" },
      { icon: <UsersRound size={20} />, value: summary.groupTrips, label: "Group trips" },
      { icon: <Ruler size={20} />, value: summary.averageGroupSize, label: "Average group size" },
      { icon: <Clock size={20} />, value: summary.planningTrips, label: "Planning" },
      { icon: <CheckCircle2 size={20} />, value: summary.completedTrips, label: "Completed" }
    ];
  }

  return (
    <div>
      {/* Banner, like the traveller dashboard */}
      <Paper className="hero" radius="lg" p="xl" mb="lg">
        <Text className="eyebrow">Administrator</Text>
        <Title order={1}>Admin Dashboard</Title>
        <Text c="white" opacity={0.8}>
          See how TripSync AI is being used, manage user accounts, and add destinations from the Destinations page.
        </Text>
      </Paper>

      {error && <Alert color="red" variant="light" mb="md">{error}</Alert>}

      {/* Platform analytics (FR-10.2) */}
      {summary && (
        <div>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} mb="lg">
            {tiles.map((tile) => (
              <Paper key={tile.label} withBorder radius="lg" p="md">
                <Group>
                  <ThemeIcon size={42} radius="md" variant="light">{tile.icon}</ThemeIcon>
                  <div>
                    <Text size="xl" fw={800}>{tile.value}</Text>
                    <Text size="sm" c="dimmed">{tile.label}</Text>
                  </div>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>

          <Card mb="lg">
            <Title order={3} mb="sm">Most popular destinations</Title>
            {summary.popularDestinations.length === 0 && <Text c="dimmed">No trips yet.</Text>}
            <Stack gap="sm">
              {summary.popularDestinations.map((place, index) => (
                <div key={place.name}>
                  <Group justify="space-between" mb={4}>
                    <Text fw={600}>{index + 1}. {place.name}</Text>
                    <Text size="sm" c="dimmed">{place.trips} trip{place.trips === 1 ? "" : "s"}</Text>
                  </Group>
                  <Progress value={(place.trips / summary.popularDestinations[0].trips) * 100} size="lg" radius="xl" />
                </div>
              ))}
            </Stack>
          </Card>
        </div>
      )}

      {/* Table of all users */}
      <Card>
        <Title order={3} mb="sm">Users</Title>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((account) => (
                <Table.Tr key={account._id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar size={30} radius="xl" color="maroon">{account.name.charAt(0).toUpperCase()}</Avatar>
                      <Text fw={600} size="sm">{account.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>{account.email}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={account.role === "admin" ? "yellow" : "gray"}>{account.role}</Badge>
                  </Table.Td>
                  <Table.Td>{formatDate(account.createdAt)}</Table.Td>
                  <Table.Td>
                    <Badge color={account.isActive ? "green" : "red"} variant="light">
                      {account.isActive ? "Active" : "Deactivated"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {/* An admin can't deactivate their own account */}
                    {account._id !== user.id && (
                      <Button size="xs" variant="light" color={account.isActive ? "red" : "green"} onClick={() => handleToggleActive(account)}>
                        {account.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </div>
  );
}

export default AdminPage;
