import React, { useState } from 'react';
import { Plus, Building2, RefreshCw, Users, Edit2, Trash2 } from 'lucide-react';
import { baseApi } from '../store/api/baseApi';
import { useDispatch } from 'react-redux';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { SkeletonTable } from '../components/common/Loader';
import { formatDate, formatCurrency } from '../utils/formatters';
import { PLAN_COLORS } from '../utils/constants';
import axiosInstance from '../utils/axiosInstance';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const useTenants = (params) => {
  const [data, setData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchTenants = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get('/tenants', { params });
      setData(res.data);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  }, [params.page]);

  React.useEffect(() => { fetchTenants(); }, [fetchTenants]);
  return { data, isLoading, refetch: fetchTenants };
};

const TenantModal = ({ isOpen, onClose, onSuccess }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await axiosInstance.post('/tenants', data);
      toast.success('Tenant created');
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Tenant"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={loading}>Create</Button>
        </>
      }
    >
      <form style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="form-group">
          <label className="form-label">Tenant Name</label>
          <input placeholder="Acme Corporation" {...register('name', { required: 'Required' })} className={errors.name ? 'input-error' : ''} />
          {errors.name && <span className="form-error">{errors.name.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Plan</label>
          <select {...register('plan')}>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

const Tenants = () => {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, refetch } = useTenants({ page, limit: 10 });
  const tenants = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate tenant "${name}"? All associated users will also be deactivated.`)) return;
    try {
      await axiosInstance.delete(`/tenants/${id}`);
      toast.success('Tenant deactivated');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Tenants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{pagination?.total || 0} tenants</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={refetch}>Refresh</Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Add Tenant</Button>
        </div>
      </div>

      <div className="card table-container">
        {isLoading ? <SkeletonTable rows={6} /> : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No tenants found</td></tr>
                ) : tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(var(--primary-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{tenant.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tenant.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{tenant.user_count || 0}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-danger'}`}>{tenant.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(tenant.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn action-btn--danger" onClick={() => handleDelete(tenant.id, tenant.name)} title="Deactivate">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <span className="pagination__info">Page {pagination.page} of {pagination.totalPages}</span>
                <div className="pagination__controls">
                  <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TenantModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={refetch} />
    </div>
  );
};

export default Tenants;
