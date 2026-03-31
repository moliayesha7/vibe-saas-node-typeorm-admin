import React, { useState } from 'react';
import { Plus, Search, Filter, UserCheck, UserX, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { useGetUsersQuery, useDeleteUserMutation, useCreateUserMutation, useUpdateUserMutation } from '../store/api/usersApi';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { SkeletonTable } from '../components/common/Loader';
import { formatDate, formatRelativeTime, getInitials } from '../utils/formatters';
import { ROLE_COLORS, ROLE_LABELS } from '../utils/constants';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';
import './Users.css';

const UserModal = ({ isOpen, onClose, user }) => {
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: user ? { firstName: user.first_name, lastName: user.last_name, role: user.role } : {}
  });

  const onSubmit = async (data) => {
    try {
      if (user) {
        await updateUser({ id: user.id, ...data }).unwrap();
        toast.success('User updated');
      } else {
        await createUser(data).unwrap();
        toast.success('User created');
        reset();
      }
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Operation failed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Create User'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={creating || updating}>
            {user ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form className="user-form">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input placeholder="John" {...register('firstName', { required: 'Required' })} className={errors.firstName ? 'input-error' : ''} />
            {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input placeholder="Doe" {...register('lastName', { required: 'Required' })} className={errors.lastName ? 'input-error' : ''} />
            {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
          </div>
        </div>
        {!user && (
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" placeholder="john@example.com" {...register('email', { required: 'Required' })} className={errors.email ? 'input-error' : ''} />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>
        )}
        {!user && (
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" placeholder="Min 8 characters" {...register('password', { required: 'Required', minLength: 8 })} className={errors.password ? 'input-error' : ''} />
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Role</label>
          <select {...register('role')}>
            <option value="viewer">Viewer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

const Users = () => {
  const { isAdmin, isManager } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const debouncedSearch = useDebounce(search);
  const { data, isLoading, refetch } = useGetUsersQuery({ search: debouncedSearch, role: roleFilter, page, limit: 10 });
  const [deleteUser] = useDeleteUserMutation();

  const users = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      await deleteUser(id).unwrap();
      toast.success('User deactivated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="users-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {pagination?.total || 0} total users
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={refetch}>Refresh</Button>
          {(isAdmin || isManager) && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditUser(null); setShowModal(true); }}>
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="filter-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {/* Table */}
      <div className="card table-container">
        {isLoading ? (
          <SkeletonTable rows={8} />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                  {(isAdmin || isManager) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-cell__avatar">
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt={user.first_name} />
                            : <span>{getInitials(user.first_name, user.last_name)}</span>
                          }
                        </div>
                        <div className="user-cell__info">
                          <span className="user-cell__name">{user.first_name} {user.last_name}</span>
                          <span className="user-cell__email">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span></td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatRelativeTime(user.last_login)}</td>
                    <td>{formatDate(user.created_at)}</td>
                    {(isAdmin || isManager) && (
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn" onClick={() => { setEditUser(user); setShowModal(true); }} title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button className="action-btn action-btn--danger" onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <span className="pagination__info">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="pagination__controls">
                  <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Previous</button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(p => (
                    <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <UserModal isOpen={showModal} onClose={() => setShowModal(false)} user={editUser} />
    </div>
  );
};

export default Users;
