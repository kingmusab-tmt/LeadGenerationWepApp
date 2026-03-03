"use client";

import { useState, useEffect, useCallback } from "react";
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
  DialogContentText,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Menu,
  CircularProgress,
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
  MoreVert,
  Visibility,
} from "@mui/icons-material";
import { useNotification } from "@/lib/useNotification";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserManagement = () => {
  const notify = useNotification();
  const csrfFetch = useCSRFFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: "", userName: "" });
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [actionMenuUser, setActionMenuUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/users?search=${encodeURIComponent(searchTerm)}&role=${roleFilter}&status=${statusFilter}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      notify("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter, notify]);

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEmailError(null);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingUser(null);
    setEmailError(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    if (!EMAIL_REGEX.test(editingUser.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingUser),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const data = await response.json();
      setUsers(
        users.map((user) =>
          user.id === editingUser.id ? { ...user, ...data.user } : user,
        ),
      );
      notify("User updated successfully", "success");
      handleCloseEditDialog();
    } catch (error) {
      console.error("Failed to update user:", error);
      notify("Failed to update user", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      setUsers(users.filter((user) => user.id !== userId));
      notify("User deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      notify("Failed to delete user", "error");
    } finally {
      setDeleteConfirm({ open: false, userId: "", userName: "" });
    }
  };

  const handleToggleStatus = async (
    userId: string,
    currentStatus: "active" | "suspended",
  ) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/status`, {
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
          user.id === userId ? { ...user, status: newStatus } : user,
        ),
      );
      notify(
        `User ${newStatus === "active" ? "activated" : "suspended"}`,
        "success",
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
      notify("Failed to update user status", "error");
    }
  };

  const handleOpenActionMenu = (
    event: React.MouseEvent<HTMLElement>,
    user: User,
  ) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuUser(user);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
    setActionMenuUser(null);
  };

  const handleViewUserDetails = (user: User) => {
    setDetailsModal({ open: true, user });
    handleCloseActionMenu();
  };

  const handleOpenEditFromMenu = (user: User) => {
    handleEditUser(user);
    handleCloseActionMenu();
  };

  const handleToggleStatusFromMenu = (user: User) => {
    handleToggleStatus(user.id, user.status);
    handleCloseActionMenu();
  };

  const handleOpenDeleteFromMenu = (user: User) => {
    setDeleteConfirm({
      open: true,
      userId: user.id,
      userName: user.name,
    });
    handleCloseActionMenu();
  };

  const handleCloseDetailsModal = () => {
    setDetailsModal({ open: false, user: null });
  };

  const formatDateValue = (
    value?: string,
    options?: Intl.DateTimeFormatOptions,
    fallback = "—",
  ) => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return options
      ? parsed.toLocaleString(undefined, options)
      : parsed.toLocaleString();
  };

  // Server already filters — only paginate client-side
  const paginatedUsers = users.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
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
        <CircularProgress />
      </Box>
    );
  }

  return (
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
            <IconButton onClick={fetchUsers}>
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
            value={searchTerm}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
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
              {/* <TableCell>Joined</TableCell>
              <TableCell>Last Login</TableCell> */}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                  {/* <TableCell>
                    {formatDateValue(
                      user.createdAt,
                      {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      },
                      "—",
                    )}
                  </TableCell> */}
                  {/* <TableCell>
                    {formatDateValue(user.lastLogin, undefined, "Never")}
                  </TableCell> */}
                  <TableCell>
                    <IconButton
                      onClick={(event) => handleOpenActionMenu(event, user)}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
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
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor && actionMenuUser)}
        onClose={handleCloseActionMenu}
      >
        <MenuItem
          onClick={() =>
            actionMenuUser && handleViewUserDetails(actionMenuUser)
          }
        >
          <Visibility fontSize="small" sx={{ mr: 1 }} /> View
        </MenuItem>
        <MenuItem
          onClick={() =>
            actionMenuUser && handleOpenEditFromMenu(actionMenuUser)
          }
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() =>
            actionMenuUser && handleToggleStatusFromMenu(actionMenuUser)
          }
        >
          {actionMenuUser?.status === "active" ? (
            <Block color="error" fontSize="small" sx={{ mr: 1 }} />
          ) : (
            <VerifiedUser color="success" fontSize="small" sx={{ mr: 1 }} />
          )}
          {actionMenuUser?.status === "active" ? "Suspend" : "Activate"}
        </MenuItem>
        <MenuItem
          onClick={() =>
            actionMenuUser && handleOpenDeleteFromMenu(actionMenuUser)
          }
          sx={{ color: "error.main" }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={detailsModal.open}
        onClose={handleCloseDetailsModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          User Details
          <IconButton
            aria-label="close"
            onClick={handleCloseDetailsModal}
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
          {detailsModal.user && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  pb: 0.5,
                }}
              >
                <Avatar
                  src={detailsModal.user.image}
                  alt={detailsModal.user.name}
                  sx={{ width: 44, height: 44 }}
                />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {detailsModal.user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detailsModal.user.email}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  rowGap: 1.25,
                  columnGap: 1.5,
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
                <Typography variant="body1">
                  {detailsModal.user.role}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Box>
                  <Chip
                    label={detailsModal.user.status}
                    size="small"
                    color={
                      detailsModal.user.status === "active"
                        ? "success"
                        : "error"
                    }
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Verified
                </Typography>
                <Typography variant="body1">
                  {detailsModal.user.verified ? "Yes" : "No"}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Joined
                </Typography>
                <Typography variant="body1">
                  {formatDateValue(detailsModal.user.createdAt, undefined, "—")}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Last Login
                </Typography>
                <Typography variant="body1">
                  {formatDateValue(
                    detailsModal.user.lastLogin,
                    undefined,
                    "Never",
                  )}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() =>
          setDeleteConfirm({ open: false, userId: "", userName: "" })
        }
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteConfirm.userName}</strong>? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteConfirm({ open: false, userId: "", userName: "" })
            }
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteUser(deleteConfirm.userId)}
            color="error"
            variant="contained"
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
                onChange={(e) => {
                  const value = e.target.value;
                  setEditingUser({ ...editingUser, email: value });
                  if (emailError) {
                    setEmailError(
                      EMAIL_REGEX.test(value)
                        ? null
                        : "Please enter a valid email address",
                    );
                  }
                }}
                onBlur={(e) => {
                  if (!EMAIL_REGEX.test(e.target.value)) {
                    setEmailError("Please enter a valid email address");
                  } else {
                    setEmailError(null);
                  }
                }}
                error={!!emailError}
                helperText={emailError}
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
                      role: e.target.value as User["role"],
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
                      status: e.target.value as User["status"],
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
            disabled={!!emailError}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;
