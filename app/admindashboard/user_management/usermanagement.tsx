"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Chip,
  MenuItem,
  Select,
  IconButton,
  Tooltip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import {
  Edit,
  Delete,
  VerifiedUser,
  Block,
  Search,
  FilterList,
  Refresh,
  Close,
  Save,
} from "@mui/icons-material";
import AdminDashboard from "../../layout";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "seller" | "buyer" | "user" | "business-admin" | "staff";
  status: "active" | "suspended";
  image?: string;
  createdAt: string;
  lastLogin?: string;
  verified?: boolean;
}

const UserManagement = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  useEffect(() => {
    if (!session || session.user.role !== "admin") {
      router.push("/auth/sign-in");
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/adminapi/users?search=${searchTerm}&role=${roleFilter}&status=${statusFilter}`
        );
        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        showSnackbar("Failed to fetch users", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session, searchTerm, roleFilter, statusFilter]);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/adminapi/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingUser),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const updatedUser = await response.json();
      setUsers(
        users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      showSnackbar("User updated successfully", "success");
      handleCloseEditDialog();
    } catch (error) {
      console.error("Failed to update user:", error);
      showSnackbar("Failed to update user", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/adminapi/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      setUsers(users.filter((user) => user.id !== userId));
      showSnackbar("User deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      showSnackbar("Failed to delete user", "error");
    }
  };

  const handleToggleStatus = async (
    userId: string,
    currentStatus: "active" | "suspended"
  ) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const response = await fetch(`/api/adminapi/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
      showSnackbar(
        `User ${newStatus === "active" ? "activated" : "suspended"}`,
        "success"
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
      showSnackbar("Failed to update user status", "error");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <LoadingComponent />
      </Box>
    );
  }

  return (
    <AdminDashboard>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton onClick={() => window.location.reload()}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
            <TextField
              label="Search Users"
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <Search sx={{ mr: 1, color: "action.active" }} />
                ),
              }}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
              startAdornment={<FilterList fontSize="small" sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="seller">Seller</MenuItem>
              <MenuItem value="buyer">Buyer</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar
                          src={user.image}
                          alt={user.name}
                          sx={{ width: 32, height: 32 }}
                        />
                        {user.name}
                        {user.verified && (
                          <Tooltip title="Verified">
                            <VerifiedUser color="primary" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={
                          user.role === "admin"
                            ? "error"
                            : user.role === "seller"
                            ? "primary"
                            : user.role === "buyer"
                            ? "success"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        size="small"
                        color={user.status === "active" ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEditUser(user)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          user.status === "active" ? "Suspend" : "Activate"
                        }
                      >
                        <IconButton
                          onClick={() =>
                            handleToggleStatus(user.id, user.status)
                          }
                        >
                          {user.status === "active" ? (
                            <Block color="error" fontSize="small" />
                          ) : (
                            <VerifiedUser color="success" fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDeleteUser(user.id)}>
                          <Delete color="error" fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>

        {/* Edit User Dialog */}
        <Dialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Edit User
            <IconButton
              aria-label="close"
              onClick={handleCloseEditDialog}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {editingUser && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Name"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  fullWidth
                  margin="normal"
                  type="email"
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={editingUser.role}
                    label="Role"
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value as any,
                      })
                    }
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="seller">Seller</MenuItem>
                    <MenuItem value="buyer">Buyer</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editingUser.status}
                    label="Status"
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseEditDialog}
              color="inherit"
              startIcon={<Close />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              color="primary"
              variant="contained"
              startIcon={<Save />}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </AdminDashboard>
  );
};

export default UserManagement;
