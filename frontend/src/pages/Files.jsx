import React, { useRef } from 'react';
import { Upload, FileText, Image, Trash2, RefreshCw } from 'lucide-react';
import Button from '../components/common/Button';
import { SkeletonTable } from '../components/common/Loader';
import { formatDate, formatFileSize, truncate } from '../utils/formatters';
import axiosInstance from '../utils/axiosInstance';
import toast from 'react-hot-toast';

const useFiles = () => {
  const [files, setFiles] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchFiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get('/files');
      setFiles(res.data.data || []);
    } catch { toast.error('Failed to load files'); }
    finally { setIsLoading(false); }
  }, []);

  React.useEffect(() => { fetchFiles(); }, [fetchFiles]);
  return { files, isLoading, refetch: fetchFiles };
};

const Files = () => {
  const { files, isLoading, refetch } = useFiles();
  const fileRef = useRef();
  const [uploading, setUploading] = React.useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      await axiosInstance.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded!');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await axiosInstance.delete(`/files/${id}`);
      toast.success('File deleted');
      refetch();
    } catch { toast.error('Failed to delete'); }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return <Image size={16} style={{ color: 'var(--primary)' }} />;
    return <FileText size={16} style={{ color: 'var(--warning)' }} />;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Files</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{files.length} files stored in Cloudinary</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={refetch}>Refresh</Button>
          <label>
            <Button variant="primary" icon={<Upload size={16} />} loading={uploading} onClick={() => fileRef.current.click()}>
              Upload File
            </Button>
            <input ref={fileRef} type="file" hidden accept="image/*,.pdf,.csv" onChange={handleUpload} />
          </label>
        </div>
      </div>

      <div className="card table-container">
        {isLoading ? <SkeletonTable rows={5} /> : (
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Upload size={32} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                  No files uploaded yet
                </td></tr>
              ) : files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getFileIcon(file.mimetype)}
                      <a href={file.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>
                        {truncate(file.name, 35)}
                      </a>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{file.mimetype?.split('/')[1]?.toUpperCase() || '-'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{formatFileSize(file.size)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{file.uploaded_by}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(file.created_at)}</td>
                  <td>
                    <button className="action-btn action-btn--danger" onClick={() => handleDelete(file.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Files;
